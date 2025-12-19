import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface HeartParticlesProps {
  visible: boolean;
  color?: string;
  count?: number;
  size?: number;
  centerPhoto?: string; // 单张照片URL（兼容旧版）
  centerPhotos?: string[]; // 多张照片URL数组
  photoInterval?: number; // 照片切换间隔（毫秒），默认3000
}

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

// 单张照片组件
const PhotoPlane = ({ 
  photoUrl, 
  offsetX, 
  opacity, 
  scale 
}: { 
  photoUrl: string; 
  offsetX: number; 
  opacity: number;
  scale: number;
}) => {
  const texture = useLoader(THREE.TextureLoader, photoUrl);
  
  if (!texture) return null;
  
  return (
    <mesh position={[offsetX, 0, 0.5]} scale={scale}>
      <planeGeometry args={[4, 5]} />
      <meshBasicMaterial 
        map={texture} 
        transparent 
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// 照片轮播组件 - 支持滑动切换
const PhotoCarousel = ({ 
  photos, 
  visible, 
  progress,
  interval = 3000
}: { 
  photos: string[]; 
  visible: boolean; 
  progress: number;
  interval?: number;
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
  
  const baseScale = progress * 0.8;
  const baseOpacity = progress * 0.95;
  const slideOffset = slideProgress * 6;
  
  const nextIndex = (displayIndex + 1) % photos.length;
  
  return (
    <group ref={groupRef}>
      <PhotoPlane
        photoUrl={photos[displayIndex]}
        offsetX={-slideOffset}
        opacity={baseOpacity * (1 - slideProgress * 0.5)}
        scale={baseScale}
      />
      {isSliding && photos.length > 1 && (
        <PhotoPlane
          photoUrl={photos[nextIndex]}
          offsetX={6 - slideOffset}
          opacity={baseOpacity * slideProgress}
          scale={baseScale}
        />
      )}
    </group>
  );
};

// 兼容旧版单张照片
const CenterPhotoPlane = ({ photoUrl, visible, progress }: { photoUrl: string; visible: boolean; progress: number }) => {
  return (
    <PhotoCarousel 
      photos={[photoUrl]} 
      visible={visible} 
      progress={progress}
    />
  );
};

export const HeartParticles = ({ 
  visible, 
  color = '#FF1493', 
  count = 1500, 
  size = 1, 
  centerPhoto,
  centerPhotos,
  photoInterval = 3000
}: HeartParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progressRef = useRef(0);
  const initializedRef = useRef(false);
  const { camera } = useThree();
  
  const { heartPositions, scatteredPositions } = useMemo(() => ({
    heartPositions: generateHeartPoints(count),
    scatteredPositions: generateScatteredPositions(count)
  }), [count]);
  
  // 初始化位置
  const currentPositions = useMemo(() => {
    return new Float32Array(scatteredPositions);
  }, [scatteredPositions]);
  
  useFrame((_, delta) => {
    if (!pointsRef.current || !groupRef.current || !materialRef.current) return;
    
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
    const progress = progressRef.current;
    
    // 缓动函数
    const eased = 1 - Math.pow(1 - progress, 3);
    
    // 更新粒子位置
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] = scatteredPositions[i3] + (heartPositions[i3] - scatteredPositions[i3]) * eased;
      posArray[i3 + 1] = scatteredPositions[i3 + 1] + (heartPositions[i3 + 1] - scatteredPositions[i3 + 1]) * eased;
      posArray[i3 + 2] = scatteredPositions[i3 + 2] + (heartPositions[i3 + 2] - scatteredPositions[i3 + 2]) * eased;
    }
    
    posAttr.needsUpdate = true;
    
    // 更新透明度
    materialRef.current.opacity = progress * 0.85;
  });
  
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
      {/* 中心照片轮播 */}
      {(centerPhotos && centerPhotos.length > 0) ? (
        <PhotoCarousel 
          photos={centerPhotos} 
          visible={visible} 
          progress={progressRef.current}
          interval={photoInterval}
        />
      ) : centerPhoto ? (
        <CenterPhotoPlane 
          photoUrl={centerPhoto} 
          visible={visible} 
          progress={progressRef.current} 
        />
      ) : null}
    </group>
  );
};

export default HeartParticles;
