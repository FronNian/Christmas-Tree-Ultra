import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TextParticlesProps {
  text: string;
  visible: boolean;
  color?: string;
  size?: number;
  onComplete?: () => void;
}

// 简单的伪随机数生成器（基于种子）
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 检测是否移动端
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 检测是否包含中文
const containsChinese = (text: string) => /[\u4e00-\u9fa5]/.test(text);

// 使用 Canvas 渲染文字并提取像素点位置
const generateTextPositionsFromCanvas = (
  text: string, 
  scale: number, 
  particleSeeds: Float32Array,
  isMobile: boolean
): Float32Array => {
  const count = particleSeeds.length;
  const targets = new Float32Array(count * 3);
  
  if (!text || text.trim() === '') {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  const hasChinese = containsChinese(text);
  // 中文使用更大的字体以获得更多像素点
  const baseFontSize = isMobile ? (hasChinese ? 120 : 80) : (hasChinese ? 200 : 120);
  // 使用系统默认中文字体 - 中文优先使用中文字体
  const fontFamily = hasChinese 
    ? '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "SimHei", sans-serif' 
    : 'Arial, sans-serif';
  
  ctx.font = `bold ${baseFontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const rawTextWidth = metrics.width;
  
  const maxCanvasWidth = isMobile ? 500 : 800;
  
  let fontSize = baseFontSize;
  if (rawTextWidth > maxCanvasWidth) {
    fontSize = Math.floor(baseFontSize * maxCanvasWidth / rawTextWidth);
    fontSize = Math.max(fontSize, isMobile ? 40 : 60);
  }
  
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  const finalMetrics = ctx.measureText(text);
  const textWidth = finalMetrics.width;
  const textHeight = fontSize * 1.3;
  
  const padding = 30;
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
  // 中文需要更密集的采样（步长越小越密集）
  const sampleStep = isMobile ? (hasChinese ? 1 : 2) : (hasChinese ? 1 : 2);
  const spaceScale = scale * (hasChinese ? 0.06 : 0.08);
  
  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = pixels[idx + 3];
      
      if (alpha > 100) {
        const posX = (x - canvas.width / 2) * spaceScale;
        const posY = (canvas.height / 2 - y) * spaceScale;
        basePositions.push({ x: posX, y: posY });
      }
    }
  }
  
  if (basePositions.length === 0) {
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  for (let i = 0; i < count; i++) {
    const seed = particleSeeds[i];
    const baseIdx = Math.floor(seededRandom(seed * 1.1) * basePositions.length);
    const base = basePositions[baseIdx];
    
    const offsetX = (seededRandom(seed * 2.2) - 0.5) * scale * 0.12;
    const offsetY = (seededRandom(seed * 3.3) - 0.5) * scale * 0.12;
    const offsetZ = (seededRandom(seed * 4.4) - 0.5) * 0.2;
    
    targets[i * 3] = base.x + offsetX;
    targets[i * 3 + 1] = base.y + 5 + offsetY;
    targets[i * 3 + 2] = offsetZ;
  }
  
  return targets;
};

export const TextParticles = ({ text, visible, color = '#FFD700', size = 1 }: TextParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const initializedRef = useRef(false);
  const lastTextRef = useRef(text);
  const lastVisibleRef = useRef(visible);
  const { camera } = useThree();
  const [isReady, setIsReady] = useState(false);
  
  // 中文需要更多粒子才能显示清晰
  const hasChinese = containsChinese(text);
  const count = hasChinese ? 5000 : 2000;
  const mobile = isMobileDevice();
  
  const particleSeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i + 0.5;
    }
    return arr;
  }, [count]);
  
  const randoms = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = seededRandom(i * 5.5);
    }
    return arr;
  }, [count]);
  
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  
  // 异步生成位置，避免阻塞主线程
  useEffect(() => {
    const scale = mobile ? 0.6 : 1.0;
    // 使用 requestAnimationFrame 延迟执行，避免卡顿
    const rafId = requestAnimationFrame(() => {
      targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
      lastTextRef.current = text;
      setIsReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, [particleSeeds, mobile, text]);
  
  useEffect(() => {
    if (text !== lastTextRef.current) {
      setIsReady(false);
      const scale = mobile ? 0.6 : 1.0;
      const rafId = requestAnimationFrame(() => {
        targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
        lastTextRef.current = text;
        setIsReady(true);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [text, particleSeeds, mobile]);
  
  useEffect(() => {
    if (visible && !lastVisibleRef.current) {
      if (text !== lastTextRef.current) {
        setIsReady(false);
        const scale = mobile ? 0.6 : 1.0;
        requestAnimationFrame(() => {
          targetPositionsRef.current = generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
          lastTextRef.current = text;
          setIsReady(true);
        });
      }
    }
    lastVisibleRef.current = visible;
  }, [visible, text, particleSeeds, mobile]);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !groupRef.current || !isReady) return;
    
    const textLength = lastTextRef.current.length;
    const baseDistance = mobile ? 18 : 25;
    const distancePerChar = mobile ? 1.5 : 2;
    const finalDistance = Math.min(60, baseDistance + textLength * distancePerChar);
    
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const targetPos = camera.position.clone().add(cameraDir.multiplyScalar(finalDistance));
    
    if (!initializedRef.current) {
      groupRef.current.position.copy(targetPos);
      initializedRef.current = true;
    } else if (visible) {
      groupRef.current.position.lerp(targetPos, Math.min(delta * 3, 0.15));
    }
    
    groupRef.current.quaternion.copy(camera.quaternion);
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;
    const targets = targetPositionsRef.current;
    const speed = 6.0;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const floatX = visible ? Math.sin(time * 1.5 + randoms[i] * 10) * 0.015 : 0;
      const floatY = visible ? Math.cos(time * 1.5 + randoms[i] * 10) * 0.015 : 0;
      
      const targetX = targets[i3] + floatX;
      const targetY = targets[i3 + 1] + floatY;
      const targetZ = targets[i3 + 2];
      
      posArray[i3] += (targetX - posArray[i3]) * delta * speed;
      posArray[i3 + 1] += (targetY - posArray[i3 + 1]) * delta * speed;
      posArray[i3 + 2] += (targetZ - posArray[i3 + 2]) * delta * speed;
    }
    
    posAttr.needsUpdate = true;
    
    if (materialRef.current) {
      const targetOpacity = visible ? 1 : 0;
      materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * delta * 4;
    }
  });
  
  const initPositions = useMemo(() => {
    const scale = mobile ? 0.6 : 1.0;
    return generateTextPositionsFromCanvas(text, scale, particleSeeds, mobile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleSeeds, mobile]);
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initPositions.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          color={color}
          size={(mobile ? 0.08 : 0.15) * size * (hasChinese ? 0.8 : 1)}
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

export default TextParticles;
