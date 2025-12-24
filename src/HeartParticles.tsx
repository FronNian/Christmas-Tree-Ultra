import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect as useEffectReact } from 'react';
import { isMobile } from './utils/helpers';
void useEffectReact; // 避免重复导入警告

interface HeartParticlesProps {
  visible: boolean;
  color?: string;
  count?: number;
  size?: number;
  centerPhoto?: string; // 单张照片URL（兼容旧版）
  centerPhotos?: string[]; // 多张照片URL数组
  photoInterval?: number; // 照片切换间隔（毫秒），默认3000
  photoScale?: number;    // 照片大小倍数，默认1
  frameColor?: string;    // 相框颜色，默认白色
  // 边框流动效果配置
  glowTrail?: {
    enabled?: boolean;      // 是否启用
    color?: string;         // 发光颜色（拖尾）
    headColor?: string;     // 头部发光颜色，默认与 color 相同
    speed?: number;         // 流动速度 (1-10)
    count?: number;         // 发光点数量
    size?: number;          // 发光点大小
    tailLength?: number;    // 拖尾长度
  };
  // 底部文字配置
  bottomText?: string;      // 底部显示的文字
  textColor?: string;       // 文字颜色
  textSize?: number;        // 文字大小倍数
  // 暂停控制回调
  onPausedChange?: (paused: boolean) => void;
}

// 生成心形轮廓点（用于边框流动效果）
// 返回两个数组：左半边和右半边，都是从底部到顶部
const generateHeartOutlineSides = (segments: number): { left: Float32Array; right: Float32Array } => {
  const left = new Float32Array(segments * 3);
  const right = new Float32Array(segments * 3);
  const scale = 0.38;
  
  for (let i = 0; i < segments; i++) {
    // 从底部(t=π)到顶部(t=0)
    const progress = i / (segments - 1); // 0 到 1
    
    // 左半边：从底部向上到左上角
    const tLeft = Math.PI - progress * Math.PI; // π 到 0
    const xLeft = 16 * Math.pow(Math.sin(tLeft), 3);
    const yLeft = 13 * Math.cos(tLeft) - 5 * Math.cos(2 * tLeft) - 2 * Math.cos(3 * tLeft) - Math.cos(4 * tLeft);
    
    left[i * 3] = xLeft * scale;
    left[i * 3 + 1] = yLeft * scale;
    left[i * 3 + 2] = 0.2;
    
    // 右半边：从底部向上到右上角（镜像）
    const tRight = Math.PI + progress * Math.PI; // π 到 2π
    const xRight = 16 * Math.pow(Math.sin(tRight), 3);
    const yRight = 13 * Math.cos(tRight) - 5 * Math.cos(2 * tRight) - 2 * Math.cos(3 * tRight) - Math.cos(4 * tRight);
    
    right[i * 3] = xRight * scale;
    right[i * 3 + 1] = yRight * scale;
    right[i * 3 + 2] = 0.2;
  }
  
  return { left, right };
};

// 使用经典心形参数方程生成点
const generateHeartPoints = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  const scale = 0.38;
  
  for (let i = 0; i < count; i++) {
    // 随机角度
    const t = Math.random() * Math.PI * 2;
    
    // 经典心形参数方程
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    
    // 随机填充因子，让点分布在心形内部
    const fill = Math.pow(Math.random(), 0.5); // sqrt 让边缘更密
    
    // 添加随机偏移避免中心线
    const offsetX = (Math.random() - 0.5) * 0.8;
    const offsetY = (Math.random() - 0.5) * 0.8;
    
    positions[i * 3] = (x * fill + offsetX) * scale;
    positions[i * 3 + 1] = (y * fill + offsetY) * scale;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  
  return positions;
};

// 生成随机散开的初始位置
const generateScatteredPositions = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 15 + 5;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  
  return positions;
};

// 带相框的照片组件
const PhotoFrame = ({ 
  photoUrl, 
  offsetX, 
  opacity, 
  scale,
  frameColor = '#FFFFFF',
  frameWidth = 0.15,
  isMobileDevice = false
}: { 
  photoUrl: string; 
  offsetX: number; 
  opacity: number;
  scale: number;
  frameColor?: string;
  frameWidth?: number;
  isMobileDevice?: boolean;
}) => {
  const texture = useLoader(THREE.TextureLoader, photoUrl);
  const [dimensions, setDimensions] = useState({ width: 4, height: 5 });
  
  // 优化纹理设置，提高清晰度，并计算实际宽高比
  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
      
      // 根据图片实际宽高比计算显示尺寸
      const image = texture.image;
      if (image && image.width && image.height) {
        const aspectRatio = image.width / image.height;
        // 移动端使用更小的基础尺寸，防止溢出
        const baseSize = isMobileDevice ? 3 : 4.5;
        // 限制最大宽高，防止超大图片溢出屏幕
        const maxWidth = isMobileDevice ? 4 : 6;
        const maxHeight = isMobileDevice ? 5 : 7;
        
        let photoWidth: number, photoHeight: number;
        if (aspectRatio >= 1) {
          // 横图
          photoWidth = baseSize * Math.sqrt(aspectRatio);
          photoHeight = baseSize / Math.sqrt(aspectRatio);
        } else {
          // 竖图
          photoWidth = baseSize * Math.sqrt(aspectRatio);
          photoHeight = baseSize / Math.sqrt(aspectRatio);
        }
        
        // 限制最大尺寸
        if (photoWidth > maxWidth) {
          const ratio = maxWidth / photoWidth;
          photoWidth = maxWidth;
          photoHeight *= ratio;
        }
        if (photoHeight > maxHeight) {
          const ratio = maxHeight / photoHeight;
          photoHeight = maxHeight;
          photoWidth *= ratio;
        }
        
        setDimensions({ width: photoWidth, height: photoHeight });
      }
    }
  }, [texture, isMobileDevice]);
  
  if (!texture) return null;
  
  const { width: photoWidth, height: photoHeight } = dimensions;
  const totalWidth = photoWidth + frameWidth * 2;
  const totalHeight = photoHeight + frameWidth * 2;
  
  return (
    <group position={[offsetX, 0, 0.5]} scale={scale}>
      {/* 相框背景 */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[totalWidth, totalHeight]} />
        <meshBasicMaterial 
          color={frameColor}
          transparent 
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* 相框内阴影（增加立体感） */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[photoWidth + 0.1, photoHeight + 0.1]} />
        <meshBasicMaterial 
          color="#000000"
          transparent 
          opacity={opacity * 0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* 照片 */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[photoWidth, photoHeight]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// 照片轮播组件 - 支持滑动切换
const PhotoCarousel = ({ 
  photos, 
  visible, 
  progress,
  interval = 3000,
  photoScale = 1,
  frameColor = '#FFFFFF',
  isMobileDevice = false
}: { 
  photos: string[]; 
  visible: boolean; 
  progress: number;
  interval?: number;
  photoScale?: number;
  frameColor?: string;
  isMobileDevice?: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentIndexRef = useRef(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const slideStartRef = useRef(0);
  const lastSwitchTimeRef = useRef(0);
  const wasVisibleRef = useRef(false);
  const hasStartedRef = useRef(false); // 是否已经开始计时
  
  // visible 变化时重置状态
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      // 刚变为可见，重置
      currentIndexRef.current = 0;
      setDisplayIndex(0);
      setSlideProgress(0);
      setIsSliding(false);
      hasStartedRef.current = false; // 等待粒子聚合完成
      lastSwitchTimeRef.current = 0;
    }
    wasVisibleRef.current = visible;
  }, [visible]);
  
  // 使用 useFrame 来控制定时切换
  useFrame(() => {
    if (!visible || photos.length <= 1) return;
    
    const now = Date.now();
    
    // 等待爱心粒子聚合完成（progress > 0.8）再开始计时
    if (!hasStartedRef.current && progress > 0.8) {
      hasStartedRef.current = true;
      lastSwitchTimeRef.current = now;
    }
    
    // 还没开始计时，不切换
    if (!hasStartedRef.current) return;
    
    if (isSliding) {
      // 正在滑动中
      const elapsed = now - slideStartRef.current;
      const slideDuration = 600;
      const newProgress = Math.min(1, elapsed / slideDuration);
      const eased = 1 - Math.pow(1 - newProgress, 3);
      setSlideProgress(eased);
      
      if (newProgress >= 1) {
        // 滑动完成
        setIsSliding(false);
        setSlideProgress(0);
        currentIndexRef.current = (currentIndexRef.current + 1) % photos.length;
        setDisplayIndex(currentIndexRef.current);
        lastSwitchTimeRef.current = now;
      }
    } else {
      // 检查是否该切换了
      if (now - lastSwitchTimeRef.current >= interval) {
        setIsSliding(true);
        slideStartRef.current = now;
      }
    }
  });
  
  if (!visible || photos.length === 0) return null;
  
  const baseScale = progress * 0.8 * photoScale;
  const baseOpacity = progress * 0.95;
  // 移动端滑动距离更小
  const slideDistance = isMobileDevice ? 4 : 6;
  const slideOffset = slideProgress * slideDistance;
  
  const nextIndex = (displayIndex + 1) % photos.length;
  
  return (
    <group ref={groupRef}>
      <PhotoFrame
        photoUrl={photos[displayIndex]}
        offsetX={-slideOffset}
        opacity={baseOpacity * (1 - slideProgress * 0.5)}
        scale={baseScale}
        frameColor={frameColor}
        isMobileDevice={isMobileDevice}
      />
      {isSliding && photos.length > 1 && (
        <PhotoFrame
          photoUrl={photos[nextIndex]}
          offsetX={slideDistance - slideOffset}
          opacity={baseOpacity * slideProgress}
          scale={baseScale}
          frameColor={frameColor}
          isMobileDevice={isMobileDevice}
        />
      )}
    </group>
  );
};

// 兼容旧版单张照片（保留以备后用）
const _CenterPhotoPlane = ({ photoUrl, visible, progress }: { photoUrl: string; visible: boolean; progress: number }) => {
  return (
    <PhotoCarousel 
      photos={[photoUrl]} 
      visible={visible} 
      progress={progress}
    />
  );
};
void _CenterPhotoPlane; // 避免 TS 未使用警告

// 统一照片展示组件 - 自动播放流程：环绕旋转(5秒) → 收缩到中心轮播
// 支持 Pinch 手势暂停/继续
type PhotoDisplayPhase = 'orbit' | 'shrinking' | 'carousel';

const UnifiedPhotoDisplay = ({
  photos,
  visible,
  progress,
  interval = 3000,
  photoScale = 1,
  frameColor = '#FFFFFF',
  isMobileDevice = false,
  paused = false,
  onPausedChange
}: {
  photos: string[];
  visible: boolean;
  progress: number;
  interval?: number;
  photoScale?: number;
  frameColor?: string;
  isMobileDevice?: boolean;
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const photoRefs = useRef<THREE.Group[]>([]);
  const rotationRef = useRef(0);
  const phaseTimeRef = useRef(0);
  const [phase, setPhase] = useState<PhotoDisplayPhase>('orbit');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const slideStartRef = useRef(0);
  const lastCarouselSwitchRef = useRef(0);
  const shrinkProgressRef = useRef(0);
  const wasVisibleRef = useRef(false);
  
  // 环绕参数
  const orbitRadius = isMobileDevice ? 8 : 12;
  const photoSize = isMobileDevice ? 0.7 : 1.0;
  // 使用「秒」作为内部时间单位，避免 ms / s 混淆
  const orbitDuration = 5;      // 环绕阶段持续 5 秒
  const shrinkDuration = 0.8;   // 收缩动画持续时间 0.8 秒
  const slideDuration = 0.6;    // 单次切换动画时间 0.6 秒
  // 轮播阶段的照片缩放（比环绕时大）
  const carouselScale = photoScale * (isMobileDevice ? 1.6 : 2.2);
  
  // visible 变化时重置状态：重新从环绕阶段开始
  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setPhase('orbit');
      phaseTimeRef.current = 0;
      rotationRef.current = 0;
      shrinkProgressRef.current = 0;
      setCarouselIndex(0);
      setSlideProgress(0);
      setIsSliding(false);
      lastCarouselSwitchRef.current = 0;
    }
    wasVisibleRef.current = visible;
  }, [visible]);
  
  useFrame((state, delta) => {
    if (!groupRef.current || !visible) return;
    
    const now = Date.now();
    
    // 暂停时不更新时间和动画
    if (!paused) {
      // 统一使用秒为单位
      phaseTimeRef.current += delta;

      // 环绕阶段：围绕中心旋转
      if (phase === 'orbit') {
        rotationRef.current += delta * 0.5;
        if (phaseTimeRef.current >= orbitDuration) {
          setPhase('shrinking');
          phaseTimeRef.current = 0;
        }
      } else if (phase === 'shrinking') {
        // 收缩阶段：从环绕过渡到中心
        const t = Math.min(1, phaseTimeRef.current / shrinkDuration);
        shrinkProgressRef.current = t;
        if (t >= 1) {
          setPhase('carousel');
          phaseTimeRef.current = 0;
          lastCarouselSwitchRef.current = now;
        }
      } else if (phase === 'carousel' && photos.length > 1) {
        if (isSliding) {
          const elapsed = now - slideStartRef.current;
          const newProgress = Math.min(1, elapsed / slideDuration);
          const eased = 1 - Math.pow(1 - newProgress, 3);
          setSlideProgress(eased);
          
          if (newProgress >= 1) {
            setIsSliding(false);
            setSlideProgress(0);
            const nextIndex = (carouselIndex + 1) % photos.length;

            setCarouselIndex(nextIndex);
            lastCarouselSwitchRef.current = now;
          }
        } else {
          // 控制总展示时长≈ interval（包含0.6s切换动画），避免实际比设置值慢
          const effectiveInterval = Math.max(200, interval - slideDuration);
          if (now - lastCarouselSwitchRef.current >= effectiveInterval) {
            setIsSliding(true);
            slideStartRef.current = now;
          }
        }
      }
    }
    
    // 更新每张照片的位置
    const baseRotation = rotationRef.current;
    const shrinkEased = 1 - Math.pow(1 - shrinkProgressRef.current, 3);
    
    photoRefs.current.forEach((ref, i) => {
      if (!ref) return;
      
      const baseAngle = (i / photos.length) * Math.PI * 2;
      const currentAngle = baseAngle + baseRotation;
      
      // 计算环绕位置
      const orbitX = Math.cos(currentAngle) * orbitRadius;
      const orbitY = 0;
      const orbitZ = Math.sin(currentAngle) * orbitRadius;
      
      // 根据阶段计算目标位置
      let targetX: number, targetY: number, targetZ: number, targetScale: number;
      let targetOpacity = progress;
      
      if (phase === 'orbit') {
        targetX = orbitX;
        targetY = orbitY;
        targetZ = orbitZ;
        targetScale = photoSize;
      } else if (phase === 'shrinking') {
        // 收缩到中心，同时放大到轮播尺寸
        targetX = orbitX * (1 - shrinkEased);
        targetY = orbitY * (1 - shrinkEased);
        targetZ = orbitZ * (1 - shrinkEased) + 0.5 * shrinkEased;
        // 从环绕尺寸过渡到轮播尺寸
        targetScale = photoSize + (carouselScale - photoSize) * shrinkEased;
        // 非当前照片逐渐隐藏
        if (i !== carouselIndex) {
          targetOpacity = progress * (1 - shrinkEased);
        }
      } else {
        // 轮播阶段：当前照片在中心，其他隐藏
        const isCurrent = i === carouselIndex;
        const isNext = i === (carouselIndex + 1) % photos.length;
        
        if (isCurrent) {
          const slideOffset = isSliding ? slideProgress * (isMobileDevice ? 3.5 : 6) : 0;
          targetX = -slideOffset;
          targetY = 0;
          targetZ = 0.5;
          targetScale = carouselScale;
          targetOpacity = progress * (isSliding ? (1 - slideProgress * 0.5) : 1);
        } else if (isNext && isSliding) {
          const slideDistance = isMobileDevice ? 3.5 : 6;
          targetX = slideDistance - slideProgress * slideDistance;
          targetY = 0;
          targetZ = 0.5;
          targetScale = carouselScale;
          targetOpacity = progress * slideProgress;
        } else {
          targetX = 0;
          targetY = 0;
          targetZ = -5;
          targetScale = 0.01;
          targetOpacity = 0;
        }
      }
      
      // 平滑过渡
      ref.position.x += (targetX - ref.position.x) * 0.15;
      ref.position.y += (targetY - ref.position.y) * 0.15;
      ref.position.z += (targetZ - ref.position.z) * 0.15;
      ref.scale.setScalar(ref.scale.x + (targetScale - ref.scale.x) * 0.1);
      
      // 更新透明度
      ref.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshBasicMaterial;
          if (mat.opacity !== undefined) {
            mat.opacity += (targetOpacity * 0.95 - mat.opacity) * 0.1;
          }
        }
      });
      
      // 始终面向相机
      ref.lookAt(state.camera.position);
    });
  });
  
  // 处理点击暂停/继续
  const handleClick = () => {
    onPausedChange?.(!paused);
  };
  
  if (!visible || photos.length === 0) return null;
  
  return (
    <group ref={groupRef} onClick={handleClick}>
      {photos.map((photo, index) => (
        <group
          key={index}
          ref={(el) => { if (el) photoRefs.current[index] = el; }}
          scale={photoSize * progress}
        >
          <OrbitingPhotoFrame
            photoUrl={photo}
            opacity={progress}
            frameColor={frameColor}
            isMobileDevice={isMobileDevice}
          />
        </group>
      ))}
    </group>
  );
};

// 单个环绕照片相框
const OrbitingPhotoFrame = ({
  photoUrl,
  opacity,
  frameColor = '#FFFFFF',
  isMobileDevice = false
}: {
  photoUrl: string;
  opacity: number;
  frameColor?: string;
  isMobileDevice?: boolean;
}) => {
  const texture = useLoader(THREE.TextureLoader, photoUrl);
  const [dimensions, setDimensions] = useState({ width: 3, height: 4 });
  
  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = 16;
      texture.needsUpdate = true;
      
      const image = texture.image;
      if (image && image.width && image.height) {
        const aspectRatio = image.width / image.height;
        const baseSize = isMobileDevice ? 2.5 : 3.5;
        
        let photoWidth: number, photoHeight: number;
        if (aspectRatio >= 1) {
          photoWidth = baseSize;
          photoHeight = baseSize / aspectRatio;
        } else {
          photoWidth = baseSize * aspectRatio;
          photoHeight = baseSize;
        }
        
        setDimensions({ width: photoWidth, height: photoHeight });
      }
    }
  }, [texture, isMobileDevice]);
  
  if (!texture) return null;
  
  const frameWidth = 0.12;
  const { width: photoWidth, height: photoHeight } = dimensions;
  
  return (
    <group>
      {/* 相框背景 */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[photoWidth + frameWidth * 2, photoHeight + frameWidth * 2]} />
        <meshBasicMaterial 
          color={frameColor}
          transparent 
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      
      {/* 照片 */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[photoWidth, photoHeight]} />
        <meshBasicMaterial 
          map={texture} 
          transparent 
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// 浪漫粒子效果 - 小爱心和星星
const RomanticParticles = ({
  visible,
  progress,
  count = 50
}: {
  visible: boolean;
  progress: number;
  count?: number;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 10;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, [count]);
  
  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.02;
      arr[i * 3 + 1] = Math.random() * 0.03 + 0.01;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return arr;
  }, [count]);
  
  useFrame(() => {
    if (!pointsRef.current || !materialRef.current) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      posArray[i * 3] += velocities[i * 3];
      posArray[i * 3 + 1] += velocities[i * 3 + 1];
      posArray[i * 3 + 2] += velocities[i * 3 + 2];
      
      // 超出范围重置
      if (posArray[i * 3 + 1] > 8) {
        posArray[i * 3 + 1] = -5;
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 10;
        posArray[i * 3] = Math.cos(angle) * radius;
        posArray[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }
    
    posAttr.needsUpdate = true;
    materialRef.current.opacity = progress * 0.6;
  });
  
  if (!visible) return null;
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color="#FFB6C1"
        size={0.15}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// 简单的伪随机数生成器（基于种子）
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 使用 Canvas 渲染文字并提取像素点位置（用于底部文字）
const generateBottomTextPositions = (
  text: string, 
  scale: number, 
  particleSeeds: Float32Array,
  isMobileDevice: boolean,
  yOffset: number = -8 // 底部偏移
): Float32Array => {
  const count = particleSeeds.length;
  const targets = new Float32Array(count * 3);
  
  if (!text || text.trim() === '') {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = (seededRandom(i * 1.1) - 0.5) * 20;
      targets[i * 3 + 1] = yOffset + (seededRandom(i * 2.2) - 0.5) * 5;
      targets[i * 3 + 2] = (seededRandom(i * 3.3) - 0.5) * 2;
    }
    return targets;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = yOffset;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  const fontSize = isMobileDevice ? 40 : 60;
  const fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif';
  
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.2;
  
  const padding = 10;
  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = Math.ceil(textHeight + padding * 2);
  
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  const basePositions: { x: number; y: number }[] = [];
  const sampleStep = isMobileDevice ? 3 : 2;
  
  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = pixels[idx + 3];
      if (alpha > 128) {
        const posX = (x - canvas.width / 2) * scale * 0.08;
        const posY = (canvas.height / 2 - y) * scale * 0.08 + yOffset;
        basePositions.push({ x: posX, y: posY });
      }
    }
  }
  
  if (basePositions.length === 0) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = yOffset;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  for (let i = 0; i < count; i++) {
    const seed = particleSeeds[i];
    const baseIdx = Math.floor(seededRandom(seed * 1.1) * basePositions.length);
    const base = basePositions[baseIdx];
    
    const offsetX = (seededRandom(seed * 2.2) - 0.5) * scale * 0.1;
    const offsetY = (seededRandom(seed * 3.3) - 0.5) * scale * 0.1;
    const offsetZ = (seededRandom(seed * 4.4) - 0.5) * 0.2;
    
    targets[i * 3] = base.x + offsetX;
    targets[i * 3 + 1] = base.y + offsetY;
    targets[i * 3 + 2] = offsetZ;
  }
  
  return targets;
};

// 底部文字粒子组件
const BottomTextParticles = ({
  text,
  visible,
  progress,
  color = '#FFD700',
  size = 1
}: {
  text: string;
  visible: boolean;
  progress: number;
  color?: string;
  size?: number;
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const lastTextRef = useRef(text);
  const mobile = isMobile();
  
  const count = 1000;
  
  const particleSeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i + 100.5;
    }
    return arr;
  }, []);
  
  const randoms = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = seededRandom(i * 7.7);
    }
    return arr;
  }, []);
  
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  
  // 计算底部偏移（根据是否有照片调整）
  const yOffset = mobile ? -6 : -8;
  
  useEffect(() => {
    const scale = mobile ? 0.8 : 1.0;
    targetPositionsRef.current = generateBottomTextPositions(text, scale, particleSeeds, mobile, yOffset);
    lastTextRef.current = text;
  }, [text, particleSeeds, mobile, yOffset]);
  
  const initPositions = useMemo(() => {
    const scale = mobile ? 0.8 : 1.0;
    return generateBottomTextPositions(text, scale, particleSeeds, mobile, yOffset);
  }, [text, particleSeeds, mobile, yOffset]);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !materialRef.current) return;
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;
    const targets = targetPositionsRef.current;
    
    const speed = 2.0;
    const targetProgress = visible ? progress : 0;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 散开位置
      const scatterX = (seededRandom(i * 1.1) - 0.5) * 30;
      const scatterY = yOffset + (seededRandom(i * 2.2) - 0.5) * 15;
      const scatterZ = (seededRandom(i * 3.3) - 0.5) * 10;
      
      // 插值到目标位置
      const targetX = scatterX + (targets[i3] - scatterX) * targetProgress;
      const targetY = scatterY + (targets[i3 + 1] - scatterY) * targetProgress;
      const targetZ = scatterZ + (targets[i3 + 2] - scatterZ) * targetProgress;
      
      posArray[i3] += (targetX - posArray[i3]) * delta * speed;
      posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * delta * speed;
      posArray[i3 + 2] += (targetZ - posArray[i3 + 2]) * delta * speed;
      
      if (visible && progress > 0.5) {
        posArray[i3] += Math.sin(time * 1.5 + randoms[i] * 10) * 0.002;
        posArray[i3 + 1] += Math.cos(time * 1.5 + randoms[i] * 10) * 0.002;
      }
    }
    
    posAttr.needsUpdate = true;
    
    const targetOpacity = visible ? progress * 0.9 : 0;
    materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * delta * 3;
  });
  
  if (!text) return null;
  
  return (
    <points ref={pointsRef} position={[0, 0, 0.3]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[initPositions.slice(), 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={(mobile ? 0.1 : 0.18) * size}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// 创建圆形发光纹理
const createGlowTexture = (): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  // 创建径向渐变（圆形发光效果）
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// 边框流动发光效果组件 - 流星效果
const GlowTrailEffect = ({
  visible,
  progress,
  config
}: {
  visible: boolean;
  progress: number;
  config: {
    enabled?: boolean;
    color?: string;
    headColor?: string;    // 头部发光颜色，默认与 color 相同
    speed?: number;
    count?: number;
    size?: number;
    tailLength?: number;
  };
}) => {
  const trailRef = useRef<THREE.Points>(null);
  const trailMaterialRef = useRef<THREE.PointsMaterial>(null);
  const headRef = useRef<THREE.Points>(null);
  const headMaterialRef = useRef<THREE.PointsMaterial>(null);
  const timeRef = useRef(0);
  
  const {
    enabled = true,
    color = '#FF69B4',
    headColor,  // 默认与 color 相同
    speed = 3,
    count = 1,
    size = 0.6,
    tailLength = 25
  } = config;
  
  // 头部颜色，默认与拖尾颜色相同
  const actualHeadColor = headColor || color;
  
  // 创建圆形发光纹理
  const glowTexture = useMemo(() => createGlowTexture(), []);
  
  // 生成心形轮廓（左右两边）
  const outlineSegments = 150;
  const { left: leftOutline, right: rightOutline } = useMemo(
    () => generateHeartOutlineSides(outlineSegments), 
    []
  );
  
  // 拖尾粒子（左右各 count 个点，每个点有 tailLength 个拖尾）
  const trailCount = count * tailLength * 2;
  const trailPositions = useMemo(() => new Float32Array(trailCount * 3), [trailCount]);
  const trailSizes = useMemo(() => new Float32Array(trailCount), [trailCount]);
  
  // 头部发光粒子（每边 count 个，共 count * 2 个）
  const headCount = count * 2;
  const headPositions = useMemo(() => new Float32Array(headCount * 3), [headCount]);
  const headSizes = useMemo(() => new Float32Array(headCount), [headCount]);
  
  useFrame((_, delta) => {
    if (!trailRef.current || !trailMaterialRef.current || !enabled) return;
    if (!headRef.current || !headMaterialRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current;
    
    const trailPosAttr = trailRef.current.geometry.attributes.position;
    const trailSizeAttr = trailRef.current.geometry.attributes.size;
    const trailPosArray = trailPosAttr.array as Float32Array;
    const trailSizeArray = trailSizeAttr.array as Float32Array;
    
    const headPosAttr = headRef.current.geometry.attributes.position;
    const headSizeAttr = headRef.current.geometry.attributes.size;
    const headPosArray = headPosAttr.array as Float32Array;
    const headSizeArray = headSizeAttr.array as Float32Array;
    
    // 更新每个发光点的位置
    for (let p = 0; p < count; p++) {
      // 计算当前发光点在轮廓上的位置（0-1，从底部到顶部）
      const baseProgress = ((time * speed * 0.12) + (p / count)) % 1;
      
      // 获取头部位置
      const headExactIdx = baseProgress * (outlineSegments - 1);
      const headSegIdx = Math.floor(headExactIdx);
      const headSegFrac = headExactIdx - headSegIdx;
      const headSegIdxSafe = Math.max(0, Math.min(outlineSegments - 2, headSegIdx));
      const headNextIdx = headSegIdxSafe + 1;
      
      // 左边头部
      const leftHeadX = leftOutline[headSegIdxSafe * 3] * (1 - headSegFrac) + leftOutline[headNextIdx * 3] * headSegFrac;
      const leftHeadY = leftOutline[headSegIdxSafe * 3 + 1] * (1 - headSegFrac) + leftOutline[headNextIdx * 3 + 1] * headSegFrac;
      headPosArray[p * 2 * 3] = leftHeadX;
      headPosArray[p * 2 * 3 + 1] = leftHeadY;
      headPosArray[p * 2 * 3 + 2] = 0.35;
      headSizeArray[p * 2] = size * 1.2 * progress; // 头部稍大
      
      // 右边头部
      const rightHeadX = rightOutline[headSegIdxSafe * 3] * (1 - headSegFrac) + rightOutline[headNextIdx * 3] * headSegFrac;
      const rightHeadY = rightOutline[headSegIdxSafe * 3 + 1] * (1 - headSegFrac) + rightOutline[headNextIdx * 3 + 1] * headSegFrac;
      headPosArray[(p * 2 + 1) * 3] = rightHeadX;
      headPosArray[(p * 2 + 1) * 3 + 1] = rightHeadY;
      headPosArray[(p * 2 + 1) * 3 + 2] = 0.35;
      headSizeArray[p * 2 + 1] = size * 1.2 * progress;
      
      // 绘制拖尾 - 从头部到尾部逐渐变细
      for (let t = 0; t < tailLength; t++) {
        const tailRatio = t / tailLength;
        const tailFade = Math.pow(1 - tailRatio, 3); // 更快衰减，尾部更细
        const tailOffset = t * 0.008;
        
        let currentProgress = baseProgress - tailOffset;
        if (currentProgress < 0) currentProgress += 1;
        
        const exactIdx = currentProgress * (outlineSegments - 1);
        const segIdx = Math.floor(exactIdx);
        const segFrac = exactIdx - segIdx;
        const segIdxSafe = Math.max(0, Math.min(outlineSegments - 2, segIdx));
        const nextIdx = segIdxSafe + 1;
        
        // 左边拖尾
        const leftIdx = (p * tailLength + t) * 2;
        trailPosArray[leftIdx * 3] = leftOutline[segIdxSafe * 3] * (1 - segFrac) + leftOutline[nextIdx * 3] * segFrac;
        trailPosArray[leftIdx * 3 + 1] = leftOutline[segIdxSafe * 3 + 1] * (1 - segFrac) + leftOutline[nextIdx * 3 + 1] * segFrac;
        trailPosArray[leftIdx * 3 + 2] = 0.3;
        trailSizeArray[leftIdx] = size * 0.8 * tailFade * progress; // 整体更细
        
        // 右边拖尾
        const rightIdx = leftIdx + 1;
        trailPosArray[rightIdx * 3] = rightOutline[segIdxSafe * 3] * (1 - segFrac) + rightOutline[nextIdx * 3] * segFrac;
        trailPosArray[rightIdx * 3 + 1] = rightOutline[segIdxSafe * 3 + 1] * (1 - segFrac) + rightOutline[nextIdx * 3 + 1] * segFrac;
        trailPosArray[rightIdx * 3 + 2] = 0.3;
        trailSizeArray[rightIdx] = size * 0.8 * tailFade * progress;
      }
    }
    
    trailPosAttr.needsUpdate = true;
    trailSizeAttr.needsUpdate = true;
    headPosAttr.needsUpdate = true;
    headSizeAttr.needsUpdate = true;
    
    trailMaterialRef.current.opacity = progress * 0.85;
    headMaterialRef.current.opacity = progress;
  });
  
  if (!visible || !enabled) return null;
  
  return (
    <group>
      {/* 拖尾 */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trailPositions, 3]} />
          <bufferAttribute attach="attributes-size" args={[trailSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          ref={trailMaterialRef}
          color={color}
          size={size}
          map={glowTexture}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* 头部发光 */}
      <points ref={headRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[headPositions, 3]} />
          <bufferAttribute attach="attributes-size" args={[headSizes, 1]} />
        </bufferGeometry>
        <pointsMaterial
          ref={headMaterialRef}
          color={actualHeadColor}
          size={size * 1.2}
          map={glowTexture}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

export const HeartParticles = ({ 
  visible, 
  color = '#FF1493', 
  count = 1500, 
  size = 1, 
  centerPhoto,
  centerPhotos,
  photoInterval = 3000,
  photoScale = 1,
  frameColor = '#FFFFFF',
  glowTrail = { enabled: true },
  bottomText,
  textColor = '#FFD700',
  textSize = 1,
  onPausedChange
}: HeartParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0); // 用于触发子组件更新
  const [paused, setPaused] = useState(false); // 暂停状态
  const initializedRef = useRef(false);
  const timeRef = useRef(0); // 动画时间
  const { camera } = useThree();
  
  const { heartPositions, scatteredPositions, particlePhases } = useMemo(() => ({
    heartPositions: generateHeartPoints(count),
    scatteredPositions: generateScatteredPositions(count),
    // 每个粒子的随机相位，用于流动效果
    particlePhases: new Float32Array(count).map(() => Math.random() * Math.PI * 2)
  }), [count]);
  
  // 初始化位置
  const currentPositions = useMemo(() => {
    return new Float32Array(scatteredPositions);
  }, [scatteredPositions]);
  
  // 处理暂停状态变化
  const handlePausedChange = (newPaused: boolean) => {
    setPaused(newPaused);
    onPausedChange?.(newPaused);
  };
  
  // visible 变化时重置暂停状态
  useEffect(() => {
    if (!visible) {
      setPaused(false);
    }
  }, [visible]);
  
  useFrame((_state, delta) => {
    if (!pointsRef.current || !groupRef.current || !materialRef.current) return;
    
    // 更新动画时间（暂停时不更新）
    if (!paused) {
      timeRef.current += delta;
    }
    const time = timeRef.current;
    
    // 计算目标位置（相机前方）
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const targetPos = camera.position.clone().add(cameraDir.multiplyScalar(20));
    
    // 首次显示时直接设置位置，避免从原点飞过来
    if (!initializedRef.current || visible) {
      if (!initializedRef.current) {
        groupRef.current.position.copy(targetPos);
        initializedRef.current = true;
      } else {
        // 平滑跟随
        groupRef.current.position.lerp(targetPos, Math.min(delta * 3, 0.15));
      }
    }
    
    // 让爱心面向相机
    groupRef.current.quaternion.copy(camera.quaternion);
    
    // 更新动画进度
    const targetProgress = visible ? 1 : 0;
    const progressDelta = (targetProgress - progressRef.current) * Math.min(delta * 4, 0.15);
    progressRef.current += progressDelta;
    const currentProgress = progressRef.current;
    
    // 每隔一段时间更新 state 以触发子组件更新
    if (Math.abs(currentProgress - progress) > 0.02) {
      setProgress(currentProgress);
    }
    
    // 缓动函数
    const eased = 1 - Math.pow(1 - currentProgress, 3);
    
    // 心跳效果：快速收缩后缓慢舒张（模拟真实心跳）
    const heartbeatCycle = (time * 1.2) % (Math.PI * 2); // 约1秒一次心跳
    const heartbeat = heartbeatCycle < 0.5 
      ? 1 - Math.sin(heartbeatCycle * Math.PI * 2) * 0.08  // 快速收缩
      : 1 + Math.sin((heartbeatCycle - 0.5) * 1.2) * 0.04; // 缓慢舒张
    
    const breathe = (1 + (heartbeat - 1) * eased);
    
    // 更新粒子位置（带心跳和流动效果）
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const baseX = scatteredPositions[i3] + (heartPositions[i3] - scatteredPositions[i3]) * eased;
      const baseY = scatteredPositions[i3 + 1] + (heartPositions[i3 + 1] - scatteredPositions[i3 + 1]) * eased;
      const baseZ = scatteredPositions[i3 + 2] + (heartPositions[i3 + 2] - scatteredPositions[i3 + 2]) * eased;
      
      // 流动效果：粒子沿着心形轮廓方向微微移动
      const phase = particlePhases[i];
      const flowSpeed = 2;
      const flowAmount = 0.15 * eased;
      
      // 计算流动偏移（沿切线方向）
      const angle = Math.atan2(baseY, baseX);
      const flowOffset = Math.sin(time * flowSpeed + phase) * flowAmount;
      const flowX = -Math.sin(angle) * flowOffset;
      const flowY = Math.cos(angle) * flowOffset;
      
      // 脉冲波效果：从中心向外扩散
      const distFromCenter = Math.sqrt(baseX * baseX + baseY * baseY);
      const pulseWave = Math.sin(time * 3 - distFromCenter * 0.5 + phase) * 0.1 * eased;
      
      // 应用心跳 + 流动 + 脉冲效果
      posArray[i3] = (baseX + flowX) * breathe * (1 + pulseWave);
      posArray[i3 + 1] = (baseY + flowY) * breathe * (1 + pulseWave);
      posArray[i3 + 2] = baseZ + Math.sin(time * 2 + phase) * 0.05 * eased; // Z轴微微浮动
    }
    
    posAttr.needsUpdate = true;
    
    // 闪烁效果：透明度随心跳变化
    const twinkle = 0.8 + (heartbeat - 0.92) * 2;
    materialRef.current.opacity = currentProgress * Math.max(0.7, Math.min(1, twinkle));
    
    // 粒子大小也随心跳变化
    materialRef.current.size = 0.25 * size * breathe * (1 + Math.sin(time * 3) * 0.1 * eased);
  });
  
  // 获取要显示的照片列表
  const photosToShow = centerPhotos && centerPhotos.length > 0 
    ? centerPhotos 
    : centerPhoto 
      ? [centerPhoto] 
      : [];
  
  // 多张照片使用统一展示组件，单张照片使用轮播组件
  const useUnifiedDisplay = photosToShow.length > 1;
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[currentPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          color={color}
          size={0.25 * size}
          transparent
          opacity={0}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* 边框流动发光效果 */}
      <GlowTrailEffect
        visible={visible}
        progress={progress}
        config={{
          enabled: glowTrail?.enabled ?? true,
          color: glowTrail?.color || '#FF69B4',
          headColor: glowTrail?.headColor,
          speed: glowTrail?.speed || 3,
          count: glowTrail?.count || 2,
          size: glowTrail?.size || 1.5,
          tailLength: glowTrail?.tailLength || 15
        }}
      />
      
      {/* 照片展示 - 统一模式 */}
      {useUnifiedDisplay ? (
        <UnifiedPhotoDisplay
          photos={photosToShow}
          visible={visible}
          progress={progress}
          interval={photoInterval}
          photoScale={photoScale}
          frameColor={frameColor}
          isMobileDevice={isMobile()}
          paused={paused}
          onPausedChange={handlePausedChange}
        />
      ) : photosToShow.length === 1 ? (
        <PhotoCarousel 
          photos={photosToShow} 
          visible={visible} 
          progress={progress}
          interval={photoInterval}
          photoScale={photoScale}
          frameColor={frameColor}
          isMobileDevice={isMobile()}
        />
      ) : null}
      
      {/* 浪漫粒子效果 - 多张照片时显示 */}
      {useUnifiedDisplay && (
        <RomanticParticles
          visible={visible}
          progress={progress}
          count={30}
        />
      )}
      
      {/* 底部文字粒子 */}
      {bottomText && (
        <BottomTextParticles
          text={bottomText}
          visible={visible}
          progress={progress}
          color={textColor}
          size={textSize}
        />
      )}
    </group>
  );
};

export default HeartParticles;
