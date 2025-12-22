import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape, LightColors } from '../../types';

// 默认彩灯颜色
const DEFAULT_LIGHT_COLORS: LightColors = {
  color1: '#FF0000',  // 红
  color2: '#00FF00',  // 绿
  color3: '#0000FF',  // 蓝
  color4: '#FFFF00'   // 黄
};

// 缓动函数
const easingFunctions: Record<AnimationEasing, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1; return n1 * t * t + 0.984375;
  },
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  }
};

// 种子随机函数
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 根据散开形状和索引生成位置（确定性）
const generateScatterPosition = (shape: ScatterShape, index: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 3 + 1);
  const r2 = seededRandom(index * 3 + 2);
  const r3 = seededRandom(index * 3 + 3);
  
  switch (shape) {
    case 'explosion': {
      const theta = r1 * Math.PI * 2;
      const phi = Math.acos(2 * r2 - 1);
      const r = 18 + r3 * 22;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = r1;
      const angle = t * Math.PI * 12;
      const radius = 6 + t * 22 + r2 * 4;
      const y = -18 + t * 45 + (r3 - 0.5) * 6;
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (r1 - 0.5) * 55,
        22 + r2 * 32,
        (r3 - 0.5) * 55
      );
    }
    case 'ring': {
      const angle = r1 * Math.PI * 2;
      const radius = 20 + r2 * 8;
      const y = (r3 - 0.5) * 12;
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
    case 'sphere':
    default: {
      // 均匀球形分布
      const theta = r1 * Math.PI * 2;
      const phi = Math.acos(2 * r2 - 1);
      const r = Math.cbrt(r3) * 30;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
    }
  }
};

// 生成目标位置（支持自定义尺寸）
const generateTargetPosition = (index: number, h: number, rBase: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 5 + 100);
  const r2 = seededRandom(index * 5 + 101);
  const y = (r1 * h) - (h / 2);
  const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) + 0.3;
  const theta = r2 * Math.PI * 2;
  return new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
};

// 根据聚合形状计算延迟（支持自定义尺寸）
const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape, h: number, rBase: number): number => {
  const normalizedY = (targetPos.y + h / 2) / h;
  const normalizedX = (targetPos.x + rBase) / (2 * rBase);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / rBase;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  
  switch (shape) {
    case 'stack': 
      return normalizedY * 0.85;
    case 'spiralIn': {
      const spiralTurns = 5;
      const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
      const currentTurn = normalizedY * spiralTurns;
      const positionOnSpiral = (currentTurn + normalizedAngle) / (spiralTurns + 1);
      return Math.min(0.9, positionOnSpiral * 0.95);
    }
    case 'implode': 
      return (1 - Math.min(1, dist)) * 0.8;
    case 'waterfall': 
      return (1 - normalizedY) * 0.85;
    case 'wave': 
      return normalizedX * 0.85;
    case 'direct':
    default: 
      return 0;
  }
};

interface FairyLightsProps {
  state: SceneState;
  count?: number;
  customColors?: LightColors;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  treeHeight?: number;
  treeRadius?: number;
}

export const FairyLights = ({ 
  state,
  count = CONFIG.counts.lights,
  customColors,
  easing = 'easeInOut', 
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct',
  treeHeight,
  treeRadius
}: FairyLightsProps) => {
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;
  // 合并自定义颜色
  const lightColors = useMemo(() => {
    const colors = { ...DEFAULT_LIGHT_COLORS, ...customColors };
    return [colors.color1, colors.color2, colors.color3, colors.color4];
  }, [customColors]);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);
  
  // 清理资源：在组件卸载时释放 geometry
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);
  
  // 存储当前动画中的 chaos 位置（用于平滑过渡散开形状）
  const currentChaosRef = useRef<THREE.Vector3[]>([]);
  const targetChaosRef = useRef<THREE.Vector3[]>([]);
  const chaosTransitionRef = useRef(1);
  const prevScatterShapeRef = useRef(scatterShape);

  // 基础数据（不依赖 scatterShape）
  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const targetPos = generateTargetPosition(i, actualHeight, actualRadius);
      const r1 = seededRandom(i * 4 + 200);
      const r2 = seededRandom(i * 4 + 201);
      const r3 = seededRandom(i * 4 + 202);
      const color = lightColors[Math.floor(r1 * lightColors.length)];
      const blinkSpeed = 2 + r2 * 3;
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape, actualHeight, actualRadius);
      return { targetPos, color, blinkSpeed, gatherDelay, timeOffset: r3 * 100 };
    });
  }, [count, gatherShape, lightColors, actualHeight, actualRadius]);

  // 初始化 chaos 位置
  useEffect(() => {
    if (currentChaosRef.current.length !== count) {
      currentChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      targetChaosRef.current = currentChaosRef.current.map(p => p.clone());
      chaosTransitionRef.current = 1;
    }
  }, [count, data, scatterShape]);

  // 当 scatterShape 改变时，设置新的目标 chaos 位置
  useEffect(() => {
    if (prevScatterShapeRef.current !== scatterShape) {
      currentChaosRef.current = currentChaosRef.current.map((pos, i) => {
        const newPos = pos.clone();
        if (chaosTransitionRef.current < 1) {
          newPos.lerp(targetChaosRef.current[i], chaosTransitionRef.current);
        }
        return newPos;
      });
      targetChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      chaosTransitionRef.current = 0;
      prevScatterShapeRef.current = scatterShape;
    }
  }, [scatterShape, data]);

  // 动画持续时间（秒），speed 越大越快
  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    const targetProgress = isFormed ? 1 : 0;
    
    // 线性插值进度，基于持续时间
    const step = delta / duration;
    if (targetProgress > progressRef.current) {
      progressRef.current = Math.min(targetProgress, progressRef.current + step);
    } else if (targetProgress < progressRef.current) {
      progressRef.current = Math.max(targetProgress, progressRef.current - step);
    }
    const rawT = progressRef.current;
    
    // 更新 chaos 位置过渡
    if (chaosTransitionRef.current < 1) {
      chaosTransitionRef.current = Math.min(1, chaosTransitionRef.current + step);
    }
    
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      if (!objData) return;
      
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      
      // 计算当前的 chaos 位置
      const currentChaos = currentChaosRef.current[i];
      const targetChaos = targetChaosRef.current[i];
      
      // 安全检查：如果 chaos 位置未初始化，跳过
      if (!currentChaos || !targetChaos) return;
      
      const chaosT = easeFn(chaosTransitionRef.current);
      const animatedChaosPos = currentChaos.clone().lerp(targetChaos, chaosT);
      
      // 基于延迟的进度计算：delay 越大，开始动画越晚
      const delay = objData.gatherDelay;
      let elementT: number;
      if (delay === 0) {
        elementT = easeFn(rawT);
      } else {
        const adjustedT = Math.max(0, Math.min(1, (rawT - delay) / (1 - delay)));
        elementT = easeFn(adjustedT);
      }
      
      // 使用缓动函数插值位置
      mesh.position.lerpVectors(animatedChaosPos, objData.targetPos, elementT);
      
      const intensity = (Math.sin(time * objData.blinkSpeed + objData.timeOffset) + 1) / 2;
      if (mat) {
        mat.emissiveIntensity = isFormed ? 1 + intensity * 1.5 : 0.5 + intensity * 0.8;
      }
    });
  });

  // 获取初始位置
  const getInitialPosition = (index: number) => {
    if (currentChaosRef.current[index]) {
      return currentChaosRef.current[index].clone();
    }
    return generateScatterPosition(scatterShape, index);
  };

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} position={getInitialPosition(i)} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};
