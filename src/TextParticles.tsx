import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface TextParticlesProps {
  text: string;
  visible: boolean;
  color?: string;
  size?: number;
  onComplete?: () => void;
}

// 简单的像素字体数据（5x7 点阵）
const FONT_DATA: Record<string, number[][]> = {
  'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'C': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,1],[0,1,1,1,0]],
  'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'F': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'G': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  'J': [[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]],
  'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
  'S': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
  'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  'X': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
  'Y': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  'Z': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  '!': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
  '♥': [[0,0,0,0,0],[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0],[0,0,0,0,0]],
  // 数字 0-9
  '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
  '3': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '4': [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '6': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
  // 小写字母 a-z
  'a': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,1,1,1,1],[1,0,0,0,1],[0,1,1,1,1]],
  'b': [[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
  'c': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0]],
  'd': [[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
  'e': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0]],
  'f': [[0,0,1,1,0],[0,1,0,0,0],[1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  'g': [[0,0,0,0,0],[0,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],
  'h': [[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'i': [[0,0,1,0,0],[0,0,0,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  'j': [[0,0,0,1,0],[0,0,0,0,0],[0,0,1,1,0],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
  'k': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],
  'l': [[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
  'm': [[0,0,0,0,0],[0,0,0,0,0],[1,1,0,1,0],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'n': [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  'o': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  'p': [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
  'q': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1]],
  'r': [[0,0,0,0,0],[0,0,0,0,0],[1,0,1,1,0],[1,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  's': [[0,0,0,0,0],[0,0,0,0,0],[0,1,1,1,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
  't': [[0,1,0,0,0],[0,1,0,0,0],[1,1,1,1,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,1,0]],
  'u': [[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1]],
  'v': [[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  'w': [[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[0,1,0,1,0]],
  'x': [[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
  'y': [[0,0,0,0,0],[0,0,0,0,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],
  'z': [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
};

// 简单的伪随机数生成器（基于种子）
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 生成填充文字的点位置（使用固定种子，确保同一粒子去同一位置）
const generateFilledTextPositions = (text: string, scale: number = 1, _density: number = 3, particleSeeds: Float32Array): Float32Array => {
  const chars = text.split('');
  const charWidth = 6 * scale;
  const totalWidth = chars.length * charWidth;
  const startX = -totalWidth / 2;
  
  // 先收集所有像素点的基础位置
  const basePositions: { x: number; y: number }[] = [];
  chars.forEach((char, charIndex) => {
    const fontData = FONT_DATA[char] || FONT_DATA[' '];
    fontData.forEach((row, rowIndex) => {
      row.forEach((pixel, colIndex) => {
        if (pixel === 1) {
          const x = startX + charIndex * charWidth + colIndex * scale;
          const y = (3 - rowIndex) * scale;
          basePositions.push({ x, y });
        }
      });
    });
  });
  
  const count = particleSeeds.length;
  const targets = new Float32Array(count * 3);
  
  if (basePositions.length === 0) {
    // 空文字，所有粒子去中心
    for (let i = 0; i < count; i++) {
      targets[i * 3] = 0;
      targets[i * 3 + 1] = 5;
      targets[i * 3 + 2] = 0;
    }
    return targets;
  }
  
  // 每个粒子根据自己的种子选择一个基础位置，并添加固定偏移
  for (let i = 0; i < count; i++) {
    const seed = particleSeeds[i];
    const baseIdx = Math.floor(seededRandom(seed * 1.1) * basePositions.length);
    const base = basePositions[baseIdx];
    
    // 使用种子生成固定的偏移
    const offsetX = (seededRandom(seed * 2.2) - 0.5) * scale * 0.8;
    const offsetY = (seededRandom(seed * 3.3) - 0.5) * scale * 0.8;
    const offsetZ = (seededRandom(seed * 4.4) - 0.5) * 0.3;
    
    targets[i * 3] = base.x + offsetX;
    targets[i * 3 + 1] = base.y + 5 + offsetY;
    targets[i * 3 + 2] = offsetZ;
  }
  
  return targets;
};

// 检测是否移动端
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const TextParticles = ({ text, visible, color = '#FFD700', size = 1 }: TextParticlesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const initializedRef = useRef(false);
  const lastTextRef = useRef(text);
  const { camera } = useThree();
  
  const count = 1500; // 粒子数量
  const mobile = isMobileDevice();
  
  // 每个粒子的固定种子（用于动画和位置计算）
  const particleSeeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = i + 0.5; // 固定种子
    }
    return arr;
  }, []);
  
  // 随机值用于动画浮动
  const randoms = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = seededRandom(i * 5.5);
    }
    return arr;
  }, []);
  
  // 目标位置 ref（用于平滑过渡）
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(count * 3));
  
  // 初始化目标位置
  useEffect(() => {
    const scale = mobile ? 0.4 : 1.2;
    targetPositionsRef.current = generateFilledTextPositions(text, scale, mobile ? 3 : 4, particleSeeds);
    lastTextRef.current = text;
  }, []);
  
  // 文字变化时只更新目标位置（当前位置保持不变，会平滑过渡）
  useEffect(() => {
    if (text !== lastTextRef.current) {
      const scale = mobile ? 0.4 : 1.2;
      targetPositionsRef.current = generateFilledTextPositions(text, scale, mobile ? 3 : 4, particleSeeds);
      lastTextRef.current = text;
    }
  }, [text, particleSeeds, mobile]);
  
  useFrame((state, delta) => {
    if (!pointsRef.current || !groupRef.current) return;
    
    // 计算文字宽度
    const charWidth = 6;
    const textWidth = lastTextRef.current.length * charWidth * (mobile ? 0.4 : 1.2);
    
    // 根据屏幕宽度和文字宽度计算合适的距离
    const perspCamera = camera as THREE.PerspectiveCamera;
    const fov = perspCamera.fov * (Math.PI / 180);
    const aspect = state.size.width / state.size.height;
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const targetScreenWidth = 0.85;
    const distance = (textWidth / 2) / Math.tan(hFov / 2 * targetScreenWidth);
    const finalDistance = Math.max(15, Math.min(80, distance));
    
    // 计算目标位置（相机前方）
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const targetPos = camera.position.clone().add(cameraDir.multiplyScalar(finalDistance));
    
    // 首次显示时直接设置位置
    if (!initializedRef.current) {
      groupRef.current.position.copy(targetPos);
      initializedRef.current = true;
    } else if (visible) {
      groupRef.current.position.lerp(targetPos, Math.min(delta * 3, 0.15));
    }
    
    // 让文字面向相机
    groupRef.current.quaternion.copy(camera.quaternion);
    
    const posAttr = pointsRef.current.geometry.attributes.position;
    const posArray = posAttr.array as Float32Array;
    const time = state.clock.elapsedTime;
    const targets = targetPositionsRef.current;
    
    // 平滑过渡速度
    const speed = 2.5;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 始终向目标位置移动（visible 时移动到文字，不 visible 时也保持在文字位置）
      // 这样切换文字时粒子会从当前位置平滑飞到新位置
      posArray[i3] += (targets[i3] - posArray[i3]) * delta * speed;
      posArray[i3 + 1] += (targets[i3 + 1] - posArray[i3 + 1]) * delta * speed;
      posArray[i3 + 2] += (targets[i3 + 2] - posArray[i3 + 2]) * delta * speed;
      
      if (visible) {
        // 轻微浮动效果
        posArray[i3] += Math.sin(time * 1.5 + randoms[i] * 10) * 0.003;
        posArray[i3 + 1] += Math.cos(time * 1.5 + randoms[i] * 10) * 0.003;
      }
    }
    
    posAttr.needsUpdate = true;
    
    // 透明度动画
    if (materialRef.current) {
      const targetOpacity = visible ? 1 : 0;
      materialRef.current.opacity += (targetOpacity - materialRef.current.opacity) * delta * 3;
    }
  });
  
  // 初始位置（用于 bufferAttribute 初始化）
  const initPositions = useMemo(() => {
    // 生成第一个文字的位置作为初始位置
    const scale = mobile ? 0.4 : 1.2;
    return generateFilledTextPositions(text, scale, mobile ? 3 : 4, particleSeeds);
  }, []);
  
  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[initPositions.slice(), 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={materialRef}
          color={color}
          size={(mobile ? 0.15 : 0.35) * size}
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
