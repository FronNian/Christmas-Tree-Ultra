import { useRef, useMemo, useEffect } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import { getTreePosition } from '../../utils/helpers';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape } from '../../types';

// JavaScript 缓动函数（用于 chaos 位置过渡）
const easingFunctionsJS: Record<AnimationEasing, (t: number) => number> = {
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

// 缓动函数 GLSL 代码
const easingFunctions = {
  linear: 'float ease(float t) { return t; }',
  easeIn: 'float ease(float t) { return t * t * t; }',
  easeOut: 'float ease(float t) { return 1.0 - pow(1.0 - t, 3.0); }',
  easeInOut: 'float ease(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }',
  bounce: `float ease(float t) {
    float n1 = 7.5625;
    float d1 = 2.75;
    if (t < 1.0 / d1) { return n1 * t * t; }
    else if (t < 2.0 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    else if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    else { t -= 2.625 / d1; return n1 * t * t + 0.984375; }
  }`,
  elastic: `float ease(float t) {
    if (t == 0.0 || t == 1.0) return t;
    return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * 2.0943951) + 1.0;
  }`
};

// 创建带有指定缓动函数的 Shader Material
// uProgress: 0-1 表示聚合进度
// uSize: 粒子大小倍数
// uGlow: 发光强度
// uColor: 聚合后颜色
// uChaosColor: 散开时颜色
const createFoliageMaterial = (easing: AnimationEasing) => {
  const easingCode = easingFunctions[easing] || easingFunctions.easeInOut;
  
  return shaderMaterial(
    { 
      uTime: 0, 
      uColor: new THREE.Color(CONFIG.colors.emerald), 
      uChaosColor: new THREE.Color(CONFIG.colors.emerald).multiplyScalar(0.3),
      uProgress: 0,
      uSize: 1.0,
      uGlow: 1.0
    },
    `uniform float uTime; uniform float uProgress; uniform float uSize;
    attribute vec3 aTargetPos; attribute float aRandom; attribute float aGatherDelay;
    varying vec2 vUv; varying float vMix;
    ${easingCode}
    void main() {
      vUv = uv;
      vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
      
      // 基于延迟的进度计算：delay 越大，开始动画越晚
      float adjustedT;
      if (aGatherDelay < 0.001) {
        adjustedT = uProgress;
      } else {
        adjustedT = clamp((uProgress - aGatherDelay) / (1.0 - aGatherDelay + 0.001), 0.0, 1.0);
      }
      float t = ease(adjustedT);
      
      vec3 finalPos = mix(position, aTargetPos + noise, t);
      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_PointSize = (60.0 * uSize * (1.0 + aRandom)) / -mvPosition.z;
      gl_Position = projectionMatrix * mvPosition;
      vMix = t;
    }`,
    `uniform vec3 uColor; uniform vec3 uChaosColor; uniform float uGlow; varying float vMix;
    void main() {
      float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
      vec3 chaosCol = uChaosColor;
      vec3 formedCol = uColor * uGlow;
      vec3 finalColor = mix(chaosCol, formedCol, vMix);
      gl_FragColor = vec4(finalColor, 1.0);
    }`
  );
};

// 预创建所有缓动类型的材质
const FoliageMaterialLinear = createFoliageMaterial('linear');
const FoliageMaterialEaseIn = createFoliageMaterial('easeIn');
const FoliageMaterialEaseOut = createFoliageMaterial('easeOut');
const FoliageMaterialEaseInOut = createFoliageMaterial('easeInOut');
const FoliageMaterialBounce = createFoliageMaterial('bounce');
const FoliageMaterialElastic = createFoliageMaterial('elastic');

extend({ 
  FoliageMaterialLinear,
  FoliageMaterialEaseIn,
  FoliageMaterialEaseOut,
  FoliageMaterialEaseInOut,
  FoliageMaterialBounce,
  FoliageMaterialElastic
});

interface FoliageProps {
  state: SceneState;
  count?: number;
  color?: string;
  chaosColor?: string;
  size?: number;
  glow?: number;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  treeHeight?: number;
  treeRadius?: number;
}

// 种子随机函数
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 根据散开形状生成初始位置（确定性，基于索引）
// scaleMultiplier: 基于树形尺寸的缩放系数
const generateScatterPositions = (count: number, shape: ScatterShape, scaleMultiplier: number = 1): Float32Array => {
  const positions = new Float32Array(count * 3);
  
  switch (shape) {
    case 'explosion': {
      for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const r3 = seededRandom(i * 3 + 3);
        const theta = r1 * Math.PI * 2;
        const phi = Math.acos(2 * r2 - 1);
        const r = (15 + r3 * 20) * scaleMultiplier;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      break;
    }
    case 'spiral': {
      for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const t = i / count;
        const angle = t * Math.PI * 12;
        const r = (5 + t * 20 + r1 * 3) * scaleMultiplier;
        const y = (-15 + t * 40 + (r2 - 0.5) * 5) * scaleMultiplier;
        positions[i * 3] = r * Math.cos(angle);
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = r * Math.sin(angle);
      }
      break;
    }
    case 'rain': {
      for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const r3 = seededRandom(i * 3 + 3);
        positions[i * 3] = (r1 - 0.5) * 50 * scaleMultiplier;
        positions[i * 3 + 1] = (20 + r2 * 30) * scaleMultiplier;
        positions[i * 3 + 2] = (r3 - 0.5) * 50 * scaleMultiplier;
      }
      break;
    }
    case 'ring': {
      for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const r3 = seededRandom(i * 3 + 3);
        const angle = r1 * Math.PI * 2;
        const r = (18 + r2 * 8) * scaleMultiplier;
        const y = (r3 - 0.5) * 10 * scaleMultiplier;
        const thickness = (r2 - 0.5) * 4 * scaleMultiplier;
        positions[i * 3] = (r + thickness) * Math.cos(angle);
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = (r + thickness) * Math.sin(angle);
      }
      break;
    }
    case 'sphere':
    default: {
      // 使用种子随机生成球形分布（均匀球面分布）
      for (let i = 0; i < count; i++) {
        const r1 = seededRandom(i * 3 + 1);
        const r2 = seededRandom(i * 3 + 2);
        const r3 = seededRandom(i * 3 + 3);
        // 球面坐标：theta 是水平角度，phi 是垂直角度
        const theta = r1 * Math.PI * 2;
        const phi = Math.acos(2 * r2 - 1); // 均匀分布在球面上
        // 使用立方根使粒子在球体内部均匀分布，半径随树形尺寸缩放
        const r = Math.cbrt(r3) * 25 * scaleMultiplier;
        // 标准球面坐标转换
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);     // X
        positions[i * 3 + 1] = r * Math.cos(phi);                    // Y (上下)
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta); // Z
      }
      break;
    }
  }
  
  return positions;
};

export const Foliage = ({ 
  state, 
  count: propCount,
  color = CONFIG.colors.emerald,
  chaosColor,
  size = 1,
  glow = 1,
  easing = 'easeInOut', 
  speed = 1, 
  scatterShape = 'sphere', 
  gatherShape = 'direct',
  treeHeight,
  treeRadius
}: FoliageProps) => {
  const materialRef = useRef<any>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const count = propCount || CONFIG.counts.foliage;
  
  // 计算颜色
  const formedColor = useMemo(() => new THREE.Color(color), [color]);
  const scatterColor = useMemo(() => {
    if (chaosColor) return new THREE.Color(chaosColor);
    return new THREE.Color(color).multiplyScalar(0.3);
  }, [color, chaosColor]);
  
  // 存储当前和目标 chaos 位置（用于平滑过渡）
  const currentChaosRef = useRef<Float32Array | null>(null);
  const targetChaosRef = useRef<Float32Array | null>(null);
  const chaosTransitionRef = useRef(1);
  const prevScatterShapeRef = useRef(scatterShape);
  
  // 目标位置和其他数据（不依赖 scatterShape）
  // 使用自定义尺寸或默认值
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;

  const { targetPositions, randoms, gatherDelays } = useMemo(() => {
    const targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const gatherDelays = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // 使用种子随机生成确定性的目标位置
      const r1 = seededRandom(i * 5 + 100);
      const r2 = seededRandom(i * 5 + 101);
      const [tx, ty, tz] = getTreePosition(r1, r2, actualHeight, actualRadius);
      targetPositions[i * 3] = tx;
      targetPositions[i * 3 + 1] = ty;
      targetPositions[i * 3 + 2] = tz;
      randoms[i] = seededRandom(i * 5 + 102);
      
      // 根据聚合形状计算延迟（0-1范围，值越大越晚开始动画）
      const normalizedY = (ty + actualHeight / 2) / actualHeight; // 0=底部, 1=顶部
      switch (gatherShape) {
        case 'stack':
          // 搭积木：从底部开始，底部先到位，顶部最后
          gatherDelays[i] = normalizedY * 0.85;
          break;
        case 'spiralIn': {
          // 螺旋聚合：像盘山公路一样，粒子沿着螺旋路径排队进入
          // 参考红色螺旋带子的路径：5圈螺旋
          const spiralTurns = 5;
          const angle = Math.atan2(tz, tx); // -PI 到 PI
          const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0-1
          // 计算粒子在螺旋路径上的位置（0-1）
          // 就像盘山公路，高度决定在第几圈，角度决定在这一圈的哪个位置
          const currentTurn = normalizedY * spiralTurns; // 当前在第几圈（0-5）
          const positionOnSpiral = (currentTurn + normalizedAngle) / (spiralTurns + 1);
          gatherDelays[i] = Math.min(0.9, positionOnSpiral * 0.95);
          break;
        }
        case 'implode':
          // 向心收缩：外围先动，中心最后
          const dist = Math.sqrt(tx * tx + tz * tz) / CONFIG.tree.radius;
          gatherDelays[i] = (1 - Math.min(1, dist)) * 0.8;
          break;
        case 'waterfall':
          // 瀑布：从顶部开始落下，顶部先到位
          gatherDelays[i] = (1 - normalizedY) * 0.85;
          break;
        case 'wave':
          // 波浪：从左到右扫过
          const normalizedX = (tx + actualRadius) / (2 * actualRadius);
          gatherDelays[i] = normalizedX * 0.85;
          break;
        case 'direct':
        default:
          gatherDelays[i] = 0;
          break;
      }
    }
    return { targetPositions, randoms, gatherDelays };
  }, [count, gatherShape, actualHeight, actualRadius]);

  // 计算散开形状的缩放系数（基于树形尺寸与默认尺寸的比例）
  const scatterScale = useMemo(() => {
    const defaultHeight = CONFIG.tree.height;
    const defaultRadius = CONFIG.tree.radius;
    // 取高度和半径缩放的平均值
    const heightScale = actualHeight / defaultHeight;
    const radiusScale = actualRadius / defaultRadius;
    return (heightScale + radiusScale) / 2;
  }, [actualHeight, actualRadius]);

  // 初始化 chaos 位置
  const positions = useMemo(() => {
    const pos = generateScatterPositions(count, scatterShape, scatterScale);
    if (!currentChaosRef.current) {
      currentChaosRef.current = new Float32Array(pos);
      targetChaosRef.current = new Float32Array(pos);
    }
    return pos;
  }, [count, scatterShape, scatterScale]);

  // 当 scatterShape 改变时，设置新的目标 chaos 位置
  useEffect(() => {
    if (prevScatterShapeRef.current !== scatterShape && currentChaosRef.current && targetChaosRef.current) {
      // 将当前插值后的位置保存为新的起点
      const easeFn = easingFunctionsJS[easing] || easingFunctionsJS.easeInOut;
      const chaosT = easeFn(chaosTransitionRef.current);
      for (let i = 0; i < count * 3; i++) {
        currentChaosRef.current[i] = currentChaosRef.current[i] + (targetChaosRef.current[i] - currentChaosRef.current[i]) * chaosT;
      }
      // 设置新的目标位置（使用缩放系数）
      const newTargets = generateScatterPositions(count, scatterShape, scatterScale);
      targetChaosRef.current = newTargets;
      chaosTransitionRef.current = 0;
      prevScatterShapeRef.current = scatterShape;
    }
  }, [scatterShape, count, easing, scatterScale]);

  // 动画持续时间（秒），speed 越大越快：0.3x -> 3.3秒, 1x -> 1秒, 3x -> 0.33秒
  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFnJS = easingFunctionsJS[easing] || easingFunctionsJS.easeInOut;

  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      materialRef.current.uSize = size;
      materialRef.current.uGlow = glow;
      materialRef.current.uColor = formedColor;
      materialRef.current.uChaosColor = scatterColor;
      
      const targetProgress = state === 'FORMED' ? 1 : 0;
      const currentProgress = materialRef.current.uProgress;
      
      // 线性插值进度，基于持续时间
      const step = delta / duration;
      if (targetProgress > currentProgress) {
        materialRef.current.uProgress = Math.min(targetProgress, currentProgress + step);
      } else if (targetProgress < currentProgress) {
        materialRef.current.uProgress = Math.max(targetProgress, currentProgress - step);
      }
    }
    
    // 更新 chaos 位置过渡（散开形状切换时的平滑过渡）
    if (chaosTransitionRef.current < 1 && geometryRef.current && currentChaosRef.current && targetChaosRef.current) {
      const step = delta / duration;
      chaosTransitionRef.current = Math.min(1, chaosTransitionRef.current + step);
      const chaosT = easeFnJS(chaosTransitionRef.current);
      
      const positionAttr = geometryRef.current.getAttribute('position') as THREE.BufferAttribute;
      const posArray = positionAttr.array as Float32Array;
      
      for (let i = 0; i < count * 3; i++) {
        posArray[i] = currentChaosRef.current[i] + (targetChaosRef.current[i] - currentChaosRef.current[i]) * chaosT;
      }
      positionAttr.needsUpdate = true;
    }
  });

  // 根据缓动类型渲染对应材质
  const renderMaterial = () => {
    const props = { ref: materialRef, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
    switch (easing) {
      case 'linear':
        // @ts-ignore
        return <foliageMaterialLinear {...props} />;
      case 'easeIn':
        // @ts-ignore
        return <foliageMaterialEaseIn {...props} />;
      case 'easeOut':
        // @ts-ignore
        return <foliageMaterialEaseOut {...props} />;
      case 'bounce':
        // @ts-ignore
        return <foliageMaterialBounce {...props} />;
      case 'elastic':
        // @ts-ignore
        return <foliageMaterialElastic {...props} />;
      case 'easeInOut':
      default:
        // @ts-ignore
        return <foliageMaterialEaseInOut {...props} />;
    }
  };

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
        <bufferAttribute attach="attributes-aGatherDelay" args={[gatherDelays, 1]} />
      </bufferGeometry>
      {renderMaterial()}
    </points>
  );
};
