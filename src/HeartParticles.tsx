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
  frameWidth = 0.15
}: { 
  photoUrl: string; 
  offsetX: number; 
  opacity: number;
  scale: number;
  frameColor?: string;
  frameWidth?: number;
}) => {
  const texture = useLoader(THREE.TextureLoader, photoUrl);
  
  if (!texture) return null;
  
  const photoWidth = 4;
  const photoHeight = 5;
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
  frameColor = '#FFFFFF'
}: { 
  photos: string[]; 
  visible: boolean; 
  progress: number;
  interval?: number;
  photoScale?: number;
  frameColor?: string;
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
  const slideOffset = slideProgress * 6;
  
  const nextIndex = (displayIndex + 1) % photos.length;
  
  return (
    <group ref={groupRef}>
      <PhotoFrame
        photoUrl={photos[displayIndex]}
        offsetX={-slideOffset}
        opacity={baseOpacity * (1 - slideProgress * 0.5)}
        scale={baseScale}
        frameColor={frameColor}
      />
      {isSliding && photos.length > 1 && (
        <PhotoFrame
          photoUrl={photos[nextIndex]}
          offsetX={6 - slideOffset}
          opacity={baseOpacity * slideProgress}
          scale={baseScale}
          frameColor={frameColor}
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
  glowTrail = { enabled: true }
}: HeartParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0); // 用于触发子组件更新
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
  
  useFrame((_, delta) => {
    if (!pointsRef.current || !groupRef.current || !materialRef.current) return;
    
    // 更新动画时间
    timeRef.current += delta;
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
          headColor: glowTrail?.headColor,  // 默认与 color 相同
          speed: glowTrail?.speed || 3,
          count: glowTrail?.count || 2,
          size: glowTrail?.size || 1.5,
          tailLength: glowTrail?.tailLength || 15
        }}
      />
      
      {/* 中心相框轮播 */}
      {(centerPhotos && centerPhotos.length > 0) ? (
        <PhotoCarousel 
          photos={centerPhotos} 
          visible={visible} 
          progress={progress}
          interval={photoInterval}
          photoScale={photoScale}
          frameColor={frameColor}
        />
      ) : centerPhoto ? (
        <PhotoCarousel 
          photos={[centerPhoto]} 
          visible={visible} 
          progress={progress}
          photoScale={photoScale}
          frameColor={frameColor}
        />
      ) : null}
    </group>
  );
};

export default HeartParticles;
