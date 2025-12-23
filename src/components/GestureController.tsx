
import { useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { isMobile } from '../utils/helpers';

// 缩放控制参数（已移除，使用动态缩放）

// 手势类型
type GestureName =
  | 'None'
  | 'Open_Palm'
  | 'Closed_Fist'
  | 'Pointing_Up'
  | 'Thumb_Up'
  | 'Thumb_Down'
  | 'Victory'
  | 'ILoveYou'
  | 'Pinch';

interface GestureControllerProps {
  onGesture: (gesture: string) => void;
  onMove: (speed: number) => void;
  onStatus: (status: string) => void;
  debugMode: boolean;
  enabled: boolean;
  onPinch?: (pos: { x: number; y: number }) => void;
  onPalmMove?: (deltaX: number, deltaY: number) => void;
  onPalmVertical?: (y: number) => void;
  onZoom?: (delta: number) => void;
  isPhotoSelected: boolean;
  photoLocked?: boolean; // 照片锁定状态（捏合选择后锁定1秒）
  palmSpeed?: number; // 控制灵敏度的倍率
  zoomSpeed?: number; // 放大缩小速度
}

export const GestureController = ({
  onGesture,
  onMove,
  onStatus,
  debugMode,
  enabled,
  onPinch,
  onPalmMove,
  onPalmVertical,
  onZoom,
  isPhotoSelected,
  photoLocked = false, // 照片锁定状态
  palmSpeed = 25, // 默认为您建议的 25，用户可在设置中修改
  zoomSpeed = 100, // 默认放大缩小速度
}: GestureControllerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mobile = isMobile();

  // 追踪状态
  const lastPalmPosRef = useRef<{ x: number; y: number } | null>(null);
  // 位置历史记录（用于平滑去抖）
  const palmHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const lastVideoTimeRef = useRef<number>(-1);
  const gestureStreakRef = useRef<{ name: string | null; count: number }>({
    name: null,
    count: 0,
  });
  const pinchCooldownRef = useRef<number>(0);
  const pinchActiveRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(0);

  // 旋转加速度
  const rotationBoostRef = useRef<number>(0);
  // 手掌尺寸追踪
  const lastHandScaleRef = useRef<number | null>(null);

  const callbacksRef = useRef({
    onGesture,
    onMove,
    onStatus,
    debugMode,
    onPinch,
    onPalmMove,
    onPalmVertical,
    onZoom,
    isPhotoSelected,
    photoLocked,
    palmSpeed,
    zoomSpeed
  });
  callbacksRef.current = {
    onGesture,
    onMove,
    onStatus,
    debugMode,
    onPinch,
    onPalmMove,
    onPalmVertical,
    onZoom,
    isPhotoSelected,
    photoLocked,
    palmSpeed,
    zoomSpeed
  };

  /**
   * 核心算法：判断手指是否弯曲
   * 严格模式：不仅看指尖距离，还看关节角度
   */
  const getFingerState = useCallback(
    (landmarks: NormalizedLandmark[], wrist: NormalizedLandmark) => {
      // 指尖索引: 拇指4, 食指8, 中指12, 无名指16, 小指20
      // 指根索引(MCP): 拇指2, 食指5, 中指9, 无名指13, 小指17
      
      // 计算手指弯曲程度
      const isCurled = (tipIdx: number, _pipIdx: number, mcpIdx: number) => {
        const tip = landmarks[tipIdx];
        const mcp = landmarks[mcpIdx]; // 指根
        
        // 1. 指尖到手腕的距离
        const tipToWrist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const mcpToWrist = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
        
        // 2. 距离比判定
        return tipToWrist < mcpToWrist * 1.3; 
      };

      // 拇指单独逻辑
      const thumbTip = landmarks[4];
      const pinkyMCP = landmarks[17];
      const indexMCP = landmarks[5];
      
      const palmWidth = Math.hypot(indexMCP.x - pinkyMCP.x, indexMCP.y - pinkyMCP.y);
      const thumbOutDist = Math.hypot(thumbTip.x - pinkyMCP.x, thumbTip.y - pinkyMCP.y);
      const thumbExtended = thumbOutDist > palmWidth * 1.2;

      return {
        thumb: thumbExtended,
        index: !isCurled(8, 6, 5),
        middle: !isCurled(12, 10, 9),
        ring: !isCurled(16, 14, 13),
        pinky: !isCurled(20, 18, 17)
      };
    },
    []
  );

  useEffect(() => {
    if (!enabled) {
      callbacksRef.current.onStatus('AI DISABLED');
      return;
    }

    let handLandmarker: HandLandmarker | null = null;
    let requestRef: number;
    let isActive = true;

    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const localWasmRoot = `${baseUrl}/wasm`;
    const localModelPath = `${baseUrl}/models/hand_landmarker.task`;
    const cdnWasmRoot = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

    const createLandmarker = async (vision: any, delegate: 'GPU' | 'CPU') => {
      return HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: localModelPath,
          delegate
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    };

    const setup = async () => {
      callbacksRef.current.onStatus('LOADING AI...');

      try {
        const streamPromise = navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        const landmarkerPromise = (async () => {
          // 先尝试本地资源，失败再回退 CDN，保证离线/内网可用
          let vision = await FilesetResolver.forVisionTasks(localWasmRoot).catch((err) => {
            console.warn('Load wasm from local failed, fallback to CDN.', err);
            callbacksRef.current.onStatus('AI LOADING (CDN fallback)...');
            return null;
          });

          if (!vision) {
            vision = await FilesetResolver.forVisionTasks(cdnWasmRoot);
          }

          // 优先 GPU，失败自动回退 CPU，避免低端或 WebGL 问题导致整体失败
          try {
            return await createLandmarker(vision, 'GPU');
          } catch (gpuErr) {
            console.warn('GPU delegate failed, fallback to CPU.', gpuErr);
            callbacksRef.current.onStatus('AI LOADING (CPU fallback)...');
            return await createLandmarker(vision, 'CPU');
          }
        })();

        const [stream, landmarker] = await Promise.all([
          streamPromise,
          landmarkerPromise,
        ]);

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          landmarker.close();
          return;
        }

        handLandmarker = landmarker;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            if (videoRef.current && canvasRef.current) {
               requestAnimationFrame(() => {
                 if(!isActive) return;
                 callbacksRef.current.onStatus('AI READY');
                 lastFrameTimeRef.current = Date.now();
                 predictWebcam();
               });
            }
          }, { once: true });
        }
      } catch (err: unknown) {
        console.error('AI Setup Error:', err);
        const errorName = (err as { name?: string })?.name;
        if (errorName === 'NotAllowedError' || errorName === 'NotReadableError' || errorName === 'NotFoundError') {
          // 摄像头权限/设备问题，直接提示并停止重试
          callbacksRef.current.onStatus('AI PERMISSION DENIED');
        } else {
          callbacksRef.current.onStatus('AI ERROR');
        }
      }
    };

    const predictWebcam = () => {
      if (!isActive || !handLandmarker || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { debugMode: dbg } = callbacksRef.current;

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        if (video.videoWidth > 0 && canvas.width !== video.videoWidth) {
           canvas.width = video.videoWidth;
           canvas.height = video.videoHeight;
        }

        lastVideoTimeRef.current = video.currentTime;
        const now = Date.now();
        const delta = (now - lastFrameTimeRef.current) / 1000;
        lastFrameTimeRef.current = now;

        if (pinchCooldownRef.current > 0) pinchCooldownRef.current -= delta;

        const results = handLandmarker.detectForVideo(video, now);

        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const wrist = landmarks[0];

          // 调试绘制
          if (dbg && ctx) {
            const drawingUtils = new DrawingUtils(ctx);
            drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#FFD700', lineWidth: 2 });
            drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1 });
          }

          // 1. 获取手指状态
          const fingers = getFingerState(landmarks, wrist);
          
          // 2. 捏合检测
          const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
          const isPinch = pinchDist < 0.05; 

          // 3. 手掌位置 & 移动 (平滑处理)
          // 计算当前帧的原始重心
          const rawPalmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
          const rawPalmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;
          
          // 添加到历史记录
          palmHistoryRef.current.push({ x: rawPalmX, y: rawPalmY });
          if (palmHistoryRef.current.length > 4) { // 保留最近4帧
             palmHistoryRef.current.shift();
          }
          
          // 计算平均位置
          const palmX = palmHistoryRef.current.reduce((sum, p) => sum + p.x, 0) / palmHistoryRef.current.length;
          const palmY = palmHistoryRef.current.reduce((sum, p) => sum + p.y, 0) / palmHistoryRef.current.length;
          
          let dx = 0;
          let dy = 0;
          if (lastPalmPosRef.current) {
            dx = 1.0 - palmX - (1.0 - lastPalmPosRef.current.x); 
            dy = palmY - lastPalmPosRef.current.y;
          }
          lastPalmPosRef.current = { x: palmX, y: palmY };

          // 4. 手势逻辑判定
          let detectedGesture: GestureName = 'None';

          // 统计伸直的手指 (不含拇指)
          const extendedCount = (fingers.index ? 1 : 0) + (fingers.middle ? 1 : 0) + (fingers.ring ? 1 : 0) + (fingers.pinky ? 1 : 0);

          if (isPinch && fingers.middle) {
             detectedGesture = 'Pinch';
          } else if (extendedCount === 4 && fingers.thumb) {
             // 五指张开：所有手指都伸直
             detectedGesture = 'Open_Palm';
          } else if (extendedCount === 0 && !fingers.thumb) {
             // 握拳：所有手指都弯曲（包括拇指）
             detectedGesture = 'Closed_Fist';
          } else if (extendedCount === 0 && fingers.thumb) {
             // 只有拇指伸直，其他手指弯曲 - 判断拇指方向
             const thumbTipY = landmarks[4].y;
             const thumbBaseY = landmarks[2].y;
             const thumbDiffY = thumbTipY - thumbBaseY;

             if (thumbDiffY < -0.05) {
               detectedGesture = 'Thumb_Up';
             } else if (thumbDiffY > 0.05) {
               detectedGesture = 'Thumb_Down';
             } else {
               detectedGesture = 'Closed_Fist'; // 拇指水平，视为握拳
             }

          } else if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
             detectedGesture = 'Victory';
          } else if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
             detectedGesture = 'Pointing_Up';
          } else if (fingers.thumb && fingers.index && !fingers.middle && !fingers.ring && fingers.pinky) {
             detectedGesture = 'ILoveYou';
          }

          // 5. 状态平滑与防抖
          if (detectedGesture !== 'None') {
            if (gestureStreakRef.current.name === detectedGesture) {
              gestureStreakRef.current.count++;
            } else {
              gestureStreakRef.current = { name: detectedGesture, count: 1 };
            }
          } else {
            gestureStreakRef.current = { name: null, count: 0 };
          }

          const thresholdMap: Record<string, number> = {
            'Pinch': 2,
            'Open_Palm': 2,  // 提高阈值，避免误触发
            'Closed_Fist': 2, // 降低阈值，提高响应速度
            'Thumb_Up': 5,
            'Thumb_Down': 5,
            'Victory': 4,
            'ILoveYou': 5
          };
          const threshold = thresholdMap[detectedGesture] || 3;

          const isStable = gestureStreakRef.current.count >= threshold;

          if (dbg) {
             const stateStr = `T:${fingers.thumb?1:0} I:${fingers.index?1:0} M:${fingers.middle?1:0} R:${fingers.ring?1:0} P:${fingers.pinky?1:0}`;
             callbacksRef.current.onStatus(
               `${detectedGesture} (${gestureStreakRef.current.count}/${threshold}) ${stateStr}`
             );
          }

          // 6. 触发回调与物理效果
          
          // 手掌张开时的移动和缩放
          if (detectedGesture === 'Open_Palm' || extendedCount === 4) {
             // 如果在进行 Open_Palm 交互，暂停自动旋转的动量累积，改为直接控制
             rotationBoostRef.current = 0; 
             callbacksRef.current.onMove(0); // 停止自动旋转

             // 照片锁定期间禁止移动和缩放，但继续处理其他手势
             if (!callbacksRef.current.photoLocked) {
               // 缩放控制 (仅在稳定时)
               if (isStable) {
                  const handSize = Math.hypot(landmarks[0].x - landmarks[9].x, landmarks[0].y - landmarks[9].y);
                  const currentScale = lastHandScaleRef.current === null 
                     ? handSize 
                     : lastHandScaleRef.current * 0.9 + handSize * 0.1; // 平滑处理
                  
                  if (lastHandScaleRef.current !== null && callbacksRef.current.onZoom) {
                     const deltaScale = currentScale - lastHandScaleRef.current;
                     // 使用配置的缩放速度
                     const currentZoomSpeed = callbacksRef.current.zoomSpeed || 100;
                     if (Math.abs(deltaScale) > 0.001) {
                        callbacksRef.current.onZoom(deltaScale * currentZoomSpeed); 
                     }
                  }
                  lastHandScaleRef.current = currentScale;
               } else {
                 lastHandScaleRef.current = null;
               }
               
               // 视角移动
               const moveThreshold = 0.001;
               if (callbacksRef.current.onPalmMove && (Math.abs(dx) > moveThreshold || Math.abs(dy) > moveThreshold)) {
                 // 使用动态倍率 (palmSpeed)
                 callbacksRef.current.onPalmMove(dx * callbacksRef.current.palmSpeed, dy * callbacksRef.current.palmSpeed);
               }
             } else {
               // 锁定期间重置状态，但不处理移动和缩放
               lastHandScaleRef.current = null;
               lastPalmPosRef.current = null;
             }
          } else {
             lastHandScaleRef.current = null;
             lastPalmPosRef.current = null; // 重置手掌位置
             
             // 非 Open_Palm 状态下，应用旋转阻尼
             if (callbacksRef.current.isPhotoSelected || detectedGesture === 'Pinch') {
                rotationBoostRef.current = 0;
                callbacksRef.current.onMove(0);
             } else {
                rotationBoostRef.current *= 0.9;
                if (Math.abs(rotationBoostRef.current) < 0.01) rotationBoostRef.current = 0;
                callbacksRef.current.onMove(rotationBoostRef.current * 0.08);
             }
          }

          // 触发稳定手势
          if (isStable) {
            if (detectedGesture === 'Pinch') {
              if (!pinchActiveRef.current && pinchCooldownRef.current <= 0) {
                 pinchActiveRef.current = true;
                 pinchCooldownRef.current = 0.5;
                 callbacksRef.current.onPinch?.({
                   x: (landmarks[4].x + landmarks[8].x) / 2,
                   y: (landmarks[4].y + landmarks[8].y) / 2
                 });
              }
            } else {
               pinchActiveRef.current = false;
               // 移除 Open_Palm 的特殊处理，让所有手势都能触发回调
               if (detectedGesture !== 'None') {
                  callbacksRef.current.onGesture(detectedGesture);
               }
            }
          } else if (detectedGesture === 'None') {
             pinchActiveRef.current = false;
          }

        } else {
          // 未检测到手
          palmHistoryRef.current = []; 
          gestureStreakRef.current = { name: null, count: 0 };
          rotationBoostRef.current *= 0.9;
          callbacksRef.current.onMove(rotationBoostRef.current * 0.05);
          if (!dbg) callbacksRef.current.onStatus('AI READY');
        }
      }
      requestRef = requestAnimationFrame(predictWebcam);
    };

    setup();

    return () => {
      isActive = false;
      cancelAnimationFrame(requestRef);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      handLandmarker?.close();
    };
  }, [enabled, getFingerState]);

  return (
    <>
      <video
        ref={videoRef}
        style={{
          opacity: debugMode ? 0.6 : 0,
          position: 'fixed',
          top: mobile ? '60px' : '20px',
          right: '20px',
          width: debugMode ? '160px' : '1px',
          height: debugMode ? 'auto' : '1px',
          borderRadius: '8px',
          zIndex: debugMode ? 100 : -1,
          transform: 'scaleX(-1)',
          pointerEvents: 'none'
        }}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: mobile ? '60px' : '20px',
          right: '20px',
          width: debugMode ? '160px' : '1px',
          height: debugMode ? 'auto' : '1px',
          zIndex: debugMode ? 101 : -1,
          transform: 'scaleX(-1)',
          pointerEvents: 'none'
        }}
      />
    </>
  );
};
