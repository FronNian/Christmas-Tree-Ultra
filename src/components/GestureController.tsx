
import { useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { isMobile } from '../utils/helpers';

// 模型类型：'gesture' 使用 gesture_recognizer，'landmark' 使用 hand_landmarker（基于关键点自定义识别，通常更准确）
const MODEL_TYPE: 'gesture' | 'landmark' = 'landmark';

// 缩放控制参数，防止抖动导致的误触发
const ZOOM_SPEED_MIN = 0.05; // 提高阈值 (原 0.02)
const ZOOM_SPEED_MAX = 0.08; // 速度高于该值视为异常跳变
const ZOOM_DELTA_CLAMP = 25; // 单次缩放的最大幅度

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
  onZoom?: (delta: number) => void; // 新增：缩放控制
  isPhotoSelected: boolean;
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
}: GestureControllerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mobile = isMobile();

  // 追踪状态
  const lastPalmPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const gestureStreakRef = useRef<{ name: string | null; count: number }>({
    name: null,
    count: 0,
  });
  const pinchCooldownRef = useRef<number>(0);
  const pinchActiveRef = useRef<boolean>(false); // 追踪捏合按下状态，防止长按重复触发
  const lastFrameTimeRef = useRef<number>(0);

  // 旋转加速度（物理模拟）
  const rotationBoostRef = useRef<number>(0);
  // 手掌尺寸追踪（用于缩放）
  const lastHandScaleRef = useRef<number | null>(null);

  // 使用 ref 存储回调，避免 effect 重新运行
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
  };

  // 判断手指是否伸直
  // 优化：稍微提高阈值 (1.25 -> 1.3)，让"弯曲"更容易被检测到，从而改善握拳识别
  const isExtended = useCallback(
    (
      landmarks: NormalizedLandmark[],
      tipIdx: number,
      mcpIdx: number,
      wrist: NormalizedLandmark
    ): boolean => {
      const tipDist = Math.hypot(
        landmarks[tipIdx].x - wrist.x,
        landmarks[tipIdx].y - wrist.y
      );
      const mcpDist = Math.hypot(
        landmarks[mcpIdx].x - wrist.x,
        landmarks[mcpIdx].y - wrist.y
      );
      return tipDist > mcpDist * 1.3;
    },
    []
  );

  // 判断是否捏合
  const isPinching = useCallback((landmarks: NormalizedLandmark[]): boolean => {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y
    );
    return distance < 0.06;
  }, []);

  useEffect(() => {
    if (!enabled) {
      callbacksRef.current.onStatus('AI DISABLED');
      return;
    }

    let recognizer: GestureRecognizer | HandLandmarker | null = null;
    let requestRef: number;
    let isActive = true;

    const setup = async () => {
      callbacksRef.current.onStatus('LOADING AI...');

      try {
        // 并行加载：摄像头 + MediaPipe
        const streamPromise = navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        const recognizerPromise = (async () => {
          const wasmUrls = [
            '/wasm',
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
          ];

          let vision = null;
          for (const url of wasmUrls) {
            try {
              vision = await FilesetResolver.forVisionTasks(url);
              break;
            } catch {
              continue;
            }
          }

          if (!vision) throw new Error('WASM load failed');

          // 根据 MODEL_TYPE 选择不同的模型
          if (MODEL_TYPE === 'landmark') {
            // 使用 hand_landmarker.task（基于关键点，识别率通常更高）
            const modelUrls = [
              '/models/hand_landmarker.task',
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            ];

            for (const modelUrl of modelUrls) {
              try {
                return await HandLandmarker.createFromOptions(vision, {
                  baseOptions: {
                    modelAssetPath: modelUrl,
                    delegate: 'GPU',
                  },
                  runningMode: 'VIDEO',
                  numHands: 1,
                });
              } catch {
                try {
                  return await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                      modelAssetPath: modelUrl,
                      delegate: 'CPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                  });
                } catch {
                  continue;
                }
              }
            }
          } else {
            // 使用 gesture_recognizer.task（内置手势识别）
            const modelUrls = [
              '/models/gesture_recognizer.task',
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            ];

            for (const modelUrl of modelUrls) {
              try {
                return await GestureRecognizer.createFromOptions(vision, {
                  baseOptions: {
                    modelAssetPath: modelUrl,
                    delegate: 'GPU',
                  },
                  runningMode: 'VIDEO',
                  numHands: 1,
                });
              } catch {
                try {
                  return await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                      modelAssetPath: modelUrl,
                      delegate: 'CPU',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                  });
                } catch {
                  continue;
                }
              }
            }
          }
          throw new Error('Model load failed');
        })();

        const [stream, gestureRecognizer] = await Promise.all([
          streamPromise,
          recognizerPromise,
        ]);

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        recognizer = gestureRecognizer;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // 使用 loadeddata 事件替代 onloadedmetadata，更快响应
          videoRef.current.addEventListener('loadeddata', () => {
            if (videoRef.current && canvasRef.current) {
              // 延迟设置尺寸，避免卡顿
              requestAnimationFrame(() => {
                if (videoRef.current && canvasRef.current) {
                  const videoWidth = videoRef.current.videoWidth || 320;
                  const videoHeight = videoRef.current.videoHeight || 240;
                  // 只在尺寸变化时更新，避免频繁重绘
                  if (canvasRef.current.width !== videoWidth || canvasRef.current.height !== videoHeight) {
                    canvasRef.current.width = videoWidth;
                    canvasRef.current.height = videoHeight;
                  }
                }
              });
              videoRef.current.play().catch(() => {
                // 播放失败时静默处理
              });
              callbacksRef.current.onStatus('AI READY');
              lastFrameTimeRef.current = Date.now();
              predictWebcam();
            }
          }, { once: true });
        }
      } catch (err: unknown) {
        console.error('AI Setup Error:', err);
        const error = err as { name?: string };
        if (error.name === 'NotAllowedError') {
          callbacksRef.current.onStatus('CAMERA DENIED');
        } else if (error.name === 'NotFoundError') {
          callbacksRef.current.onStatus('NO CAMERA');
        } else {
          callbacksRef.current.onStatus('AI ERROR');
        }
      }
    };

    const predictWebcam = () => {
      if (!recognizer || !videoRef.current || !canvasRef.current) {
        requestRef = requestAnimationFrame(predictWebcam);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const { debugMode: dbg } = callbacksRef.current;

      // 只在视频帧更新时处理（优化：减少分辨率检查频率）
      if (
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTimeRef.current
      ) {
        // 只在必要时检查分辨率，避免每帧都检查导致卡顿
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          requestRef = requestAnimationFrame(predictWebcam);
          return;
        }
        
        lastVideoTimeRef.current = video.currentTime;

        const now = Date.now();
        const delta = (now - lastFrameTimeRef.current) / 1000;
        lastFrameTimeRef.current = now;

        // 冷却计时
        if (pinchCooldownRef.current > 0) {
          pinchCooldownRef.current -= delta;
        }

        // 根据模型类型调用不同的方法
        let results: any;
        if (MODEL_TYPE === 'landmark' && recognizer instanceof HandLandmarker) {
          results = recognizer.detectForVideo(video, now);
        } else if (recognizer instanceof GestureRecognizer) {
          results = recognizer.recognizeForVideo(video, now);
        } else {
          requestRef = requestAnimationFrame(predictWebcam);
          return;
        }

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          const wrist = landmarks[0];

          // 绘制调试信息
          if (dbg && ctx) {
            const drawingUtils = new DrawingUtils(ctx);
            // 使用通用的 HAND_CONNECTIONS（两种模型都支持）
            const HAND_CONNECTIONS = MODEL_TYPE === 'landmark' 
              ? HandLandmarker.HAND_CONNECTIONS 
              : GestureRecognizer.HAND_CONNECTIONS;
            drawingUtils.drawConnectors(
              landmarks,
              HAND_CONNECTIONS,
              { color: '#FFD700', lineWidth: 2 }
            );
            drawingUtils.drawLandmarks(landmarks, {
              color: '#FF0000',
              lineWidth: 1,
            });
          }

          // 手指状态检测
          const indexExtended = isExtended(landmarks, 8, 5, wrist);
          const middleExtended = isExtended(landmarks, 12, 9, wrist);
          const ringExtended = isExtended(landmarks, 16, 13, wrist);
          const pinkyExtended = isExtended(landmarks, 20, 17, wrist);
          const thumbExtended = isExtended(landmarks, 4, 2, wrist);
          const pinch = isPinching(landmarks);

          // 五指张开检测
          const isFiveFingers =
            indexExtended &&
            middleExtended &&
            ringExtended &&
            pinkyExtended &&
            thumbExtended;

          // 手掌中心位置
          const palmX =
            (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
          const palmY =
            (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

          // 计算手掌参考尺寸（腕部到中指指根的距离），用于归一化距离判断
          const handSize = Math.hypot(
            landmarks[0].x - landmarks[9].x,
            landmarks[0].y - landmarks[9].y
          );

          // 计算移动差值（镜像 x 轴）
          let dx = 0;
          let dy = 0;
          if (lastPalmPosRef.current) {
            dx = 1.0 - palmX - (1.0 - lastPalmPosRef.current.x);
            dy = palmY - lastPalmPosRef.current.y;
          }
          lastPalmPosRef.current = { x: palmX, y: palmY };

          // 手势识别：根据模型类型选择不同的识别方式
          let detectedGesture: GestureName = 'None';
          let gestureScore = 0;

          if (MODEL_TYPE === 'landmark') {
            // 基于关键点的自定义手势识别（通常更准确）
            // 捏合检测（优先级最高，必须中指伸直以区别于握拳）
            if (pinch && middleExtended) {
              detectedGesture = 'Pinch';
              gestureScore = 0.9;
            }
            // 五指张开
            else if (isFiveFingers) {
              detectedGesture = 'Open_Palm';
              gestureScore = 0.85;
            }
            // 改进的握拳/点赞逻辑：只要四个手指弯曲，再根据大拇指判断
            else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
               // 关键修复：通过大拇指指尖到食指指根的距离来区分握拳和点赞
               // 握拳时，拇指通常紧贴食指或中指，距离较近
               // 点赞时，拇指通常远离食指，距离较远
               const thumbTip = landmarks[4];
               const indexMCP = landmarks[5]; // 食指指根
               const distThumbIndex = Math.hypot(thumbTip.x - indexMCP.x, thumbTip.y - indexMCP.y);
               
               // 如果拇指虽然"伸直"了（相对于腕部），但实际上离食指很近（< 手掌尺寸的 60%），那这大概率是握拳（拇指搭在拳头上）
               // 反之，如果距离较远 (> 0.6 * handSize)，且拇指伸直，才是真正的点赞
               if (thumbExtended && distThumbIndex > handSize * 0.6) {
                  // 四指弯曲，拇指伸直且远离 -> 点赞
                  detectedGesture = 'Thumb_Up';
                  gestureScore = 0.8;
               } else {
                  // 四指弯曲，拇指弯曲 OR 拇指贴近拳头 -> 握拳
                  detectedGesture = 'Closed_Fist';
                  gestureScore = 0.85;
               }
            }
            // 食指向上（只有食指伸直）
            else if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
              detectedGesture = 'Pointing_Up';
              gestureScore = 0.8;
            }
            // 大拇指向下（拇指弯曲，其他手指伸直）
            else if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
              detectedGesture = 'Thumb_Down';
              gestureScore = 0.75;
            }
            // 剪刀手（食指和中指伸直，其他弯曲）
            else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
              detectedGesture = 'Victory';
              gestureScore = 0.8;
            }
            // 我爱你手势（拇指、小指、食指伸直，中指和无名指弯曲）
            else if (thumbExtended && indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
              detectedGesture = 'ILoveYou';
              gestureScore = 0.75;
            }
          } else {
            // 使用 MediaPipe 内置手势识别结果（gesture_recognizer）
            if (
              results.gestures &&
              results.gestures.length > 0 &&
              results.gestures[0].length > 0
            ) {
              const gesture = results.gestures[0][0];
              gestureScore = gesture.score;

              const gestureMap: Record<string, GestureName> = {
                Open_Palm: 'Open_Palm',
                Closed_Fist: 'Closed_Fist',
                Pointing_Up: 'Pointing_Up',
                Thumb_Up: 'Thumb_Up',
                Thumb_Down: 'Thumb_Down',
                Victory: 'Victory',
                ILoveYou: 'ILoveYou',
              };

              if (gestureScore > 0.5 && gestureMap[gesture.categoryName]) {
                detectedGesture = gestureMap[gesture.categoryName];
              }
            }

            // 捏合检测（优先级最高，补充内置识别）
            if (pinch && middleExtended) {
              detectedGesture = 'Pinch';
              gestureScore = 0.85;
            }
          }

          // 捏合抬起时重置状态，允许下一次触发
          if (!pinch) {
            pinchActiveRef.current = false;
          }

          // 手势稳定性检测
          if (detectedGesture !== 'None') {
            if (gestureStreakRef.current.name === detectedGesture) {
              gestureStreakRef.current.count++;
            } else {
              gestureStreakRef.current = { name: detectedGesture, count: 1 };
            }
          } else {
            gestureStreakRef.current = { name: null, count: 0 };
          }

          // 不同手势需要不同的稳定帧数
          const getThreshold = (gesture: GestureName): number => {
            switch (gesture) {
              case 'Pinch':
                return 2;
              case 'Open_Palm':
                return 2; // 降低阈值，更快响应
              case 'Closed_Fist':
                return 2; // 降低阈值 (3->2)，让握拳更灵敏
              case 'Victory':
                return 4;
              case 'ILoveYou':
                return 4;
              default:
                return 3;
            }
          };

          const isStable =
            gestureStreakRef.current.count >= getThreshold(detectedGesture);

          if (dbg) {
            callbacksRef.current.onStatus(
              `${detectedGesture} (${(gestureScore * 100).toFixed(0)}%) dx:${dx.toFixed(3)} boost:${rotationBoostRef.current.toFixed(2)}`
            );
          }

          // ========== 核心：五指张开时的旋转和缩放控制 ==========
          if (isFiveFingers || detectedGesture === 'Open_Palm') {
            // 1. 旋转控制：手掌水平移动控制旋转加速度
            // 极大提高灵敏度，让旋转更快响应
            if (Math.abs(dx) > 0.003) {
              // 累加加速度，方向反转（手向左移动 -> 树向右旋转）
              rotationBoostRef.current = Math.max(
                -50.0,
                Math.min(50.0, rotationBoostRef.current - dx * 150.0)
              );
            }

            // 2. 缩放控制：仅在五指完全张开且稳定时才触发
            // 增加稳定性判断：仅当旋转速度较低时才允许缩放，避免既旋转又缩放的混乱
            const isRotating = Math.abs(dx) > 0.005 || Math.abs(rotationBoostRef.current) > 2.0;

            if (isFiveFingers && isStable && detectedGesture === 'Open_Palm' && !isRotating) {
            const rawScale = Math.hypot(
                wrist.x - landmarks[9].x,
                wrist.y - landmarks[9].y
              );
            // 使用平滑后的尺度，抑制噪声 (Smoothing factor 0.9 for stability)
            const currentScale =
              lastHandScaleRef.current === null
                ? rawScale
                : lastHandScaleRef.current * 0.9 + rawScale * 0.1;
              
              if (lastHandScaleRef.current !== null) {
                const deltaScale = currentScale - lastHandScaleRef.current;
                const speed = Math.abs(deltaScale);
                // 提高阈值，避免抖动 (ZOOM_SPEED_MIN 提至 0.05)
              if (
                speed > ZOOM_SPEED_MIN &&
                speed < ZOOM_SPEED_MAX &&
                callbacksRef.current.onZoom
              ) {
                  // 反转方向：手张开放大，手收缩缩小
                const amplifiedDelta =
                  Math.sign(deltaScale) * speed * (1 + speed * 30);
                const zoomStep = Math.max(
                  -ZOOM_DELTA_CLAMP,
                  Math.min(ZOOM_DELTA_CLAMP, amplifiedDelta * 120)
                );
                callbacksRef.current.onZoom(zoomStep);
                }
              }
              lastHandScaleRef.current = currentScale;
            } else {
              // 非五指张开或不稳定时，重置缩放追踪
              lastHandScaleRef.current = null;
            }

            // 3. 传递手掌垂直位置
            if (callbacksRef.current.onPalmVertical) {
              const normalizedY = Math.max(
                0,
                Math.min(1, (palmY - 0.2) / 0.6)
              );
              callbacksRef.current.onPalmVertical(normalizedY);
            }

            // 4. 视角移动控制 - 提高灵敏度
            if (
              callbacksRef.current.onPalmMove &&
              (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005)
            ) {
              callbacksRef.current.onPalmMove(dx * 8, dy * 6);
            }
          } else {
            // 非五指张开时，重置手掌位置追踪（缩放已在上面处理）
            lastPalmPosRef.current = null;
          }

          // 旋转加速度衰减（阻尼）
          // 如果选中了照片或正在捏合，立即停止旋转
          if (callbacksRef.current.isPhotoSelected || detectedGesture === 'Pinch') {
            rotationBoostRef.current = 0;
            callbacksRef.current.onMove(0);
          } else {
            // 正常衰减
            rotationBoostRef.current *= 0.88;
            if (Math.abs(rotationBoostRef.current) < 0.01) {
              rotationBoostRef.current = 0;
            }
            // 应用旋转速度
            callbacksRef.current.onMove(rotationBoostRef.current * 0.08);
          }

          // 处理稳定的手势
          if (isStable && gestureScore > 0.5) {
            // 捏合手势
            if (
              detectedGesture === 'Pinch' &&
              pinchCooldownRef.current <= 0 &&
              !pinchActiveRef.current
            ) {
              // 加快响应，但仍保留冷却防止连续触发抖动
              pinchCooldownRef.current = 0.5;
              pinchActiveRef.current = true;
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              callbacksRef.current.onPinch?.({
                x: (thumbTip.x + indexTip.x) / 2,
                y: (thumbTip.y + indexTip.y) / 2,
              });
            }

            // 触发手势回调（排除 Open_Palm，因为它用于旋转控制）
            if (
              detectedGesture !== 'Pinch' &&
              detectedGesture !== 'None' &&
              detectedGesture !== 'Open_Palm'
            ) {
              callbacksRef.current.onGesture(detectedGesture);
            }

            // Open_Palm 和 Closed_Fist 用于状态切换
            if (
              detectedGesture === 'Open_Palm' ||
              detectedGesture === 'Closed_Fist'
            ) {
              callbacksRef.current.onGesture(detectedGesture);
            }
          }
        } else {
          // 没有检测到手 - 旋转继续衰减
          rotationBoostRef.current *= 0.95;
          if (Math.abs(rotationBoostRef.current) < 0.001) {
            rotationBoostRef.current = 0;
          }
          callbacksRef.current.onMove(rotationBoostRef.current * 0.02);

          lastPalmPosRef.current = null;
          lastHandScaleRef.current = null;
          gestureStreakRef.current = { name: null, count: 0 };
          if (!dbg) {
            callbacksRef.current.onStatus('AI READY');
          }
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
      recognizer?.close();
    };
  }, [enabled, isExtended, isPinching]);

  return (
    <>
      <video
        ref={videoRef}
        style={{
          opacity: debugMode ? 0.7 : 0,
          position: 'fixed',
          top: mobile ? '12px' : '16px',
          right: mobile ? '12px' : '20px',
          width: debugMode ? (mobile ? '120px' : '160px') : '1px',
          borderRadius: '8px',
          boxShadow: debugMode ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
          zIndex: debugMode ? 100 : -1,
          pointerEvents: 'none',
          transform: 'scaleX(-1)',
        }}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: mobile ? '12px' : '16px',
          right: mobile ? '12px' : '20px',
          width: debugMode ? (mobile ? '120px' : '160px') : '1px',
          height: debugMode ? 'auto' : '1px',
          borderRadius: '8px',
          zIndex: debugMode ? 101 : -1,
          pointerEvents: 'none',
          transform: 'scaleX(-1)',
        }}
      />
    </>
  );
};
