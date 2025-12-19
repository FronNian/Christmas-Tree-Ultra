import { useRef, useEffect } from 'react';
import { HandLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// 手部关键点索引
const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

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

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// 计算两点距离
const distance = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
};

// 计算 2D 距离（忽略 z）
const distance2D = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

// 判断手指是否伸直（放宽条件提高识别率）
const isFingerExtended = (landmarks: Landmark[], tipIdx: number, pipIdx: number, mcpIdx: number): boolean => {
  const tip = landmarks[tipIdx];
  const pip = landmarks[pipIdx];
  const mcp = landmarks[mcpIdx];
  const wrist = landmarks[LANDMARKS.WRIST];
  
  // 指尖到手腕的距离 > PIP到手腕的距离，说明手指伸直
  const tipToWrist = distance(tip, wrist);
  const pipToWrist = distance(pip, wrist);
  const mcpToWrist = distance(mcp, wrist);
  
  // 放宽条件：tipToWrist > pipToWrist * 0.95（原来是 >）
  // 并且 tipToWrist > mcpToWrist * 1.1（原来是 1.2）
  return tipToWrist > pipToWrist * 0.95 && tipToWrist > mcpToWrist * 1.1;
};

// 判断拇指是否伸直（拇指方向不同，需要特殊处理）
const isThumbExtended = (landmarks: Landmark[]): boolean => {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbIp = landmarks[LANDMARKS.THUMB_IP];
  const thumbMcp = landmarks[LANDMARKS.THUMB_MCP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  
  // 方法1：拇指尖到食指根部的距离
  const thumbToIndex = distance(thumbTip, indexMcp);
  const thumbIpToIndex = distance(thumbIp, indexMcp);
  
  // 方法2：拇指尖到拇指根部的距离（伸直时更长）
  const thumbLength = distance(thumbTip, thumbMcp);
  const thumbIpToMcp = distance(thumbIp, thumbMcp);
  
  // 两种方法任一满足即可（提高识别率）
  return thumbToIndex > thumbIpToIndex * 1.05 || thumbLength > thumbIpToMcp * 1.3;
};

// 识别手势（优化版：放宽条件提高识别率）
const recognizeGesture = (landmarks: Landmark[]): { gesture: GestureName; confidence: number } => {
  const thumbExtended = isThumbExtended(landmarks);
  const indexExtended = isFingerExtended(landmarks, LANDMARKS.INDEX_TIP, LANDMARKS.INDEX_PIP, LANDMARKS.INDEX_MCP);
  const middleExtended = isFingerExtended(landmarks, LANDMARKS.MIDDLE_TIP, LANDMARKS.MIDDLE_PIP, LANDMARKS.MIDDLE_MCP);
  const ringExtended = isFingerExtended(landmarks, LANDMARKS.RING_TIP, LANDMARKS.RING_PIP, LANDMARKS.RING_MCP);
  const pinkyExtended = isFingerExtended(landmarks, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_PIP, LANDMARKS.PINKY_MCP);
  
  const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  const fingerCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  
  // 捏合检测：拇指和食指靠近（放宽距离阈值）
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const pinchDist = distance2D(thumbTip, indexTip);
  const isPinching = pinchDist < 0.08 && (middleExtended || ringExtended);
  
  if (isPinching) {
    return { gesture: 'Pinch', confidence: 0.85 };
  }
  
  // 🖐️ 张开手掌：大部分手指伸直（放宽到3根以上）
  if (extendedCount >= 4 || (fingerCount >= 3 && thumbExtended)) {
    return { gesture: 'Open_Palm', confidence: 0.9 };
  }
  
  // ✊ 握拳：所有手指都弯曲（放宽到最多1根伸直）
  if (extendedCount <= 1 && !indexExtended && !middleExtended) {
    return { gesture: 'Closed_Fist', confidence: 0.9 };
  }
  
  // 👍 大拇指向上/向下：拇指伸直，其他手指弯曲
  if (thumbExtended && fingerCount <= 1) {
    const wrist = landmarks[LANDMARKS.WRIST];
    // 放宽 y 轴判断阈值
    if (thumbTip.y < wrist.y - 0.05) {
      return { gesture: 'Thumb_Up', confidence: 0.8 };
    }
    if (thumbTip.y > wrist.y + 0.05) {
      return { gesture: 'Thumb_Down', confidence: 0.8 };
    }
  }
  
  // ☝️ 食指向上：食指伸直，其他弯曲（允许拇指状态不确定）
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { gesture: 'Pointing_Up', confidence: 0.8 };
  }
  
  // ✌️ 剪刀手：食指和中指伸直（放宽拇指条件）
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return { gesture: 'Victory', confidence: 0.85 };
  }
  
  // 🤟 我爱你：拇指、食指、小指伸直（放宽中指和无名指条件）
  if (thumbExtended && indexExtended && pinkyExtended && !middleExtended) {
    return { gesture: 'ILoveYou', confidence: 0.8 };
  }
  
  // 备选：如果食指和小指伸直，中指弯曲，也算 ILoveYou
  if (indexExtended && pinkyExtended && !middleExtended && !ringExtended) {
    return { gesture: 'ILoveYou', confidence: 0.75 };
  }
  
  return { gesture: 'None', confidence: 0 };
};

interface GestureControllerProps {
  onGesture: (gesture: string) => void;
  onMove: (speed: number) => void;
  onStatus: (status: string) => void;
  debugMode: boolean;
  enabled: boolean;
  onPinch?: (pos: { x: number; y: number }) => void;
  onPalmMove?: (deltaX: number, deltaY: number) => void;
  onZoom?: (delta: number) => void;
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
  onZoom,
  isPhotoSelected
}: GestureControllerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 追踪状态
  const lastPalmPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastGestureRef = useRef<GestureName>('None');
  const gestureHoldCountRef = useRef(0);
  const pinchCooldownRef = useRef(0);

  const callbacksRef = useRef({ onGesture, onMove, onStatus, debugMode, onPinch, onPalmMove, onZoom, isPhotoSelected });
  callbacksRef.current = { onGesture, onMove, onStatus, debugMode, onPinch, onPalmMove, onZoom, isPhotoSelected };

  useEffect(() => {
    if (!enabled) {
      callbacksRef.current.onStatus('AI DISABLED');
      return;
    }

    let handLandmarker: HandLandmarker | null = null;
    let requestRef: number;
    let isActive = true;

    const setup = async () => {
      callbacksRef.current.onStatus('LOADING AI...');
      try {
        const wasmUrls = [
          '/wasm',
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
          'https://unpkg.com/@mediapipe/tasks-vision@0.10.3/wasm',
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
        if (!isActive) return;
        
        // HandLandmarker 模型
        const modelUrls = [
          '/models/hand_landmarker.task',
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        ];
        
        let landmarker = null;
        for (const modelUrl of modelUrls) {
          try {
            landmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: modelUrl,
                // 移动端也尝试用 GPU，性能更好；如果失败会自动回退到 CPU
                delegate: 'GPU'
              },
              runningMode: 'VIDEO',
              numHands: 1,
              // 降低检测阈值，提高识别率（牺牲一点精度换取更高召回率）
              minHandDetectionConfidence: 0.4,
              minHandPresenceConfidence: 0.4,
              minTrackingConfidence: 0.4
            });
            break;
          } catch {
            // GPU 失败时尝试 CPU
            try {
              landmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                  modelAssetPath: modelUrl,
                  delegate: 'CPU'
                },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.4,
                minHandPresenceConfidence: 0.4,
                minTrackingConfidence: 0.4
              });
              break;
            } catch {
              continue;
            }
          }
        }
        
        if (!landmarker) throw new Error('Model load failed');
        handLandmarker = landmarker;
        if (!isActive) return;

        callbacksRef.current.onStatus('REQUESTING CAMERA...');

        if (navigator.mediaDevices?.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false
            });
            if (!isActive) {
              stream.getTracks().forEach(track => track.stop());
              return;
            }
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              callbacksRef.current.onStatus('AI READY');
              predictWebcam();
            }
          } catch (camErr: any) {
            if (camErr.name === 'NotAllowedError') {
              callbacksRef.current.onStatus('CAMERA DENIED');
            } else if (camErr.name === 'NotFoundError') {
              callbacksRef.current.onStatus('NO CAMERA');
            } else {
              callbacksRef.current.onStatus('CAM ERROR');
            }
            return;
          }
        } else {
          callbacksRef.current.onStatus('NO CAMERA SUPPORT');
        }
      } catch (err: any) {
        console.error('AI Setup Error:', err);
        callbacksRef.current.onStatus('AI ERROR');
      }
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current || !canvasRef.current) {
        requestRef = requestAnimationFrame(predictWebcam);
        return;
      }
      
      if (videoRef.current.videoWidth === 0) {
        requestRef = requestAnimationFrame(predictWebcam);
        return;
      }

      const results = handLandmarker.detectForVideo(videoRef.current, Date.now());
      const ctx = canvasRef.current.getContext('2d');
      const { debugMode: dbg } = callbacksRef.current;

      // 绘制调试信息
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (dbg) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          if (results.landmarks?.length > 0) {
            const drawingUtils = new DrawingUtils(ctx);
            for (const landmarks of results.landmarks) {
              drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, { color: '#FFD700', lineWidth: 2 });
              drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1 });
            }
          }
        }
      }

      // 冷却计时
      if (pinchCooldownRef.current > 0) pinchCooldownRef.current--;

      if (results.landmarks?.length > 0) {
        const landmarks = results.landmarks[0] as Landmark[];
        const { gesture, confidence } = recognizeGesture(landmarks);
        
        // 手势稳定性检测：需要连续几帧相同手势（降低到2帧提高响应速度）
        if (gesture === lastGestureRef.current) {
          gestureHoldCountRef.current++;
        } else {
          gestureHoldCountRef.current = 0;
          lastGestureRef.current = gesture;
        }
        
        // 降低稳定性要求到2帧，提高响应速度
        const isStable = gestureHoldCountRef.current >= 2;
        
        if (dbg) {
          callbacksRef.current.onStatus(`${gesture} (${(confidence * 100).toFixed(0)}%)`);
        }

        // 手掌中心位置（用于移动追踪）
        const palmCenter = {
          x: (landmarks[LANDMARKS.WRIST].x + landmarks[LANDMARKS.MIDDLE_MCP].x) / 2,
          y: (landmarks[LANDMARKS.WRIST].y + landmarks[LANDMARKS.MIDDLE_MCP].y) / 2
        };

        // 处理手势（降低置信度阈值提高识别率）
        if (isStable && confidence > 0.6) {
          // 捏合手势
          if (gesture === 'Pinch' && pinchCooldownRef.current === 0) {
            pinchCooldownRef.current = 30;
            const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
            const indexTip = landmarks[LANDMARKS.INDEX_TIP];
            callbacksRef.current.onPinch?.({
              x: (thumbTip.x + indexTip.x) / 2,
              y: (thumbTip.y + indexTip.y) / 2
            });
          }
          
          // 张开手掌 + 移动 = 控制视角
          if (gesture === 'Open_Palm' && callbacksRef.current.onPalmMove) {
            if (lastPalmPosRef.current) {
              const deltaX = (lastPalmPosRef.current.x - palmCenter.x) * 4;
              const deltaY = (palmCenter.y - lastPalmPosRef.current.y) * 3;
              
              if (Math.abs(deltaX) > 0.008 || Math.abs(deltaY) > 0.008) {
                callbacksRef.current.onPalmMove(deltaX, deltaY);
              }
            }
            lastPalmPosRef.current = { ...palmCenter };
          } else {
            lastPalmPosRef.current = null;
          }
          
          // 大拇指向上/向下 = 缩放
          if ((gesture === 'Thumb_Up' || gesture === 'Thumb_Down') && callbacksRef.current.onZoom) {
            const zoomDelta = gesture === 'Thumb_Up' ? -0.5 : 0.5;
            callbacksRef.current.onZoom(zoomDelta);
          }
          
          // 触发手势回调（排除移动相关手势）
          if (gesture !== 'Pinch' && gesture !== 'None') {
            callbacksRef.current.onGesture(gesture);
          }
        }

        // 自动旋转（基于手的水平位置）
        if (!callbacksRef.current.isPhotoSelected && gesture !== 'Open_Palm') {
          const speed = (0.5 - palmCenter.x) * 0.1;
          callbacksRef.current.onMove(Math.abs(speed) > 0.01 ? speed : 0);
        } else {
          callbacksRef.current.onMove(0);
        }
      } else {
        // 没有检测到手
        callbacksRef.current.onMove(0);
        lastPalmPosRef.current = null;
        lastGestureRef.current = 'None';
        gestureHoldCountRef.current = 0;
        if (!dbg) {
          callbacksRef.current.onStatus('AI READY');
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
        stream.getTracks().forEach(track => track.stop());
      }
      handLandmarker?.close();
    };
  }, [enabled]);

  return (
    <>
      <video
        ref={videoRef}
        style={{
          opacity: debugMode ? 0.6 : 0,
          position: 'fixed',
          top: 0,
          right: 0,
          width: debugMode ? '320px' : '1px',
          zIndex: debugMode ? 100 : -1,
          pointerEvents: 'none',
          transform: 'scaleX(-1)'
        }}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: debugMode ? '320px' : '1px',
          height: debugMode ? 'auto' : '1px',
          zIndex: debugMode ? 101 : -1,
          pointerEvents: 'none',
          transform: 'scaleX(-1)'
        }}
      />
    </>
  );
};
