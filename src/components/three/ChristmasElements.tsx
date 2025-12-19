import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape, DecorationColors, DecorationTypes } from '../../types';

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

// 根据索引和形状生成确定性的散开位置（使用种子随机）
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// 根据散开形状和索引生成位置（确定性，同一索引同一形状总是相同位置）
const generateScatterPosition = (shape: ScatterShape, index: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 3 + 1);
  const r2 = seededRandom(index * 3 + 2);
  const r3 = seededRandom(index * 3 + 3);
  
  switch (shape) {
    case 'explosion': {
      const theta = r1 * Math.PI * 2;
      const phi = Math.acos(2 * r2 - 1);
      const r = 20 + r3 * 25;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = r1;
      const angle = t * Math.PI * 12;
      const radius = 8 + t * 25 + r2 * 5;
      const y = -20 + t * 50 + (r3 - 0.5) * 8;
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (r1 - 0.5) * 60,
        25 + r2 * 35,
        (r3 - 0.5) * 60
      );
    }
    case 'ring': {
      const angle = r1 * Math.PI * 2;
      const radius = 22 + r2 * 10;
      const y = (r3 - 0.5) * 15;
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

// 生成目标位置（树上的位置，支持自定义尺寸）
const generateTargetPosition = (index: number, h: number, rBase: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 7 + 100);
  const r2 = seededRandom(index * 7 + 101);
  const y = (r1 * h) - (h / 2);
  const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) * 0.95;
  const theta = r2 * Math.PI * 2;
  return new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
};

// 根据聚合形状计算延迟（0-1范围，值越大越晚开始动画，支持自定义尺寸）
const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape, h: number, rBase: number): number => {
  const normalizedY = (targetPos.y + h / 2) / h; // 0=底部, 1=顶部
  const normalizedX = (targetPos.x + rBase) / (2 * rBase);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / rBase;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  
  switch (shape) {
    case 'stack': 
      // 搭积木：底部先到位，顶部最后
      return normalizedY * 0.85;
    case 'spiralIn': {
      // 螺旋聚合：像盘山公路一样排队进入
      const spiralTurns = 5;
      const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
      const currentTurn = normalizedY * spiralTurns;
      const positionOnSpiral = (currentTurn + normalizedAngle) / (spiralTurns + 1);
      return Math.min(0.9, positionOnSpiral * 0.95);
    }
    case 'implode': 
      // 向心收缩：外围先动，中心最后
      return (1 - Math.min(1, dist)) * 0.8;
    case 'waterfall': 
      // 瀑布：顶部先到位，底部最后
      return (1 - normalizedY) * 0.85;
    case 'wave': 
      // 波浪：从左到右扫过
      return normalizedX * 0.85;
    case 'direct':
    default: 
      return 0;
  }
};

// 默认装饰颜色
const DEFAULT_COLORS: DecorationColors = {
  primary: '#D32F2F',   // 红色
  secondary: '#FFD700', // 金色
  accent: '#1976D2',    // 蓝色
  candy1: '#FF0000',    // 糖果红
  candy2: '#FFFFFF'     // 糖果白
};

// 默认装饰类型（全部启用）
const DEFAULT_TYPES: DecorationTypes = {
  box: true,
  sphere: true,
  cylinder: true
};

interface ChristmasElementsProps {
  state: SceneState;
  customImages?: {
    box?: string;
    sphere?: string;
    cylinder?: string;
  };
  customColors?: DecorationColors;
  decorationTypes?: DecorationTypes;
  count?: number;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  treeHeight?: number;
  treeRadius?: number;
}



export const ChristmasElements = ({ 
  state, 
  customImages,
  customColors,
  decorationTypes,
  count = CONFIG.counts.elements,
  easing = 'easeInOut', 
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct',
  treeHeight,
  treeRadius
}: ChristmasElementsProps) => {
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;
  
  // 合并装饰类型配置
  const types = useMemo(() => ({
    ...DEFAULT_TYPES,
    ...decorationTypes
  }), [decorationTypes]);
  
  // 获取启用的装饰类型列表 (0=box, 1=sphere, 2=cylinder)
  const enabledTypes = useMemo(() => {
    const result: number[] = [];
    if (types.box) result.push(0);
    if (types.sphere) result.push(1);
    if (types.cylinder) result.push(2);
    // 如果全部关闭，默认启用球体
    if (result.length === 0) result.push(1);
    return result;
  }, [types]);
  
  // 合并自定义颜色
  const colors = useMemo(() => ({
    ...DEFAULT_COLORS,
    ...customColors
  }), [customColors]);
  
  // 装饰颜色数组（用于随机选择）
  const decorationColors = useMemo(() => [
    colors.primary,
    colors.secondary,
    colors.accent
  ], [colors]);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  
  // 存储当前动画中的 chaos 位置（用于平滑过渡散开形状）
  const currentChaosRef = useRef<THREE.Vector3[]>([]);
  const targetChaosRef = useRef<THREE.Vector3[]>([]);
  const chaosTransitionRef = useRef(1); // 0-1，chaos 位置过渡进度
  const prevScatterShapeRef = useRef(scatterShape);

  // 加载自定义图片纹理
  const textures = useMemo(() => {
    const result: { box?: THREE.Texture; sphere?: THREE.Texture; cylinder?: THREE.Texture } = {};
    
    if (customImages?.box) {
      const tex = new THREE.TextureLoader().load(customImages.box);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.box = tex;
    }
    if (customImages?.sphere) {
      const tex = new THREE.TextureLoader().load(customImages.sphere);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.sphere = tex;
    }
    if (customImages?.cylinder) {
      const tex = new THREE.TextureLoader().load(customImages.cylinder);
      tex.colorSpace = THREE.SRGBColorSpace;
      result.cylinder = tex;
    }
    
    return result;
  }, [customImages?.box, customImages?.sphere, customImages?.cylinder]);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  // 基础数据（不依赖 scatterShape，只在 count 或 gatherShape 或 colors 或尺寸或类型变化时重新生成）
  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const targetPos = generateTargetPosition(i, actualHeight, actualRadius);
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape, actualHeight, actualRadius);

      const r1 = seededRandom(i * 5 + 200);
      const r2 = seededRandom(i * 5 + 201);
      const r3 = seededRandom(i * 5 + 202);
      const r4 = seededRandom(i * 5 + 203);
      const r5 = seededRandom(i * 5 + 204);
      const r6 = seededRandom(i * 5 + 205);
      const r7 = seededRandom(i * 5 + 206);

      // 从启用的类型中选择（根据原始随机值映射到启用的类型）
      const typeIndex = Math.floor(r1 * enabledTypes.length);
      const type = enabledTypes[typeIndex];
      
      let color;
      let scale = 1;
      if (type === 0) {
        // 礼物盒使用自定义颜色
        color = decorationColors[Math.floor(r2 * decorationColors.length)];
        scale = 0.8 + r3 * 0.4;
      } else if (type === 1) {
        // 球体使用自定义颜色
        color = decorationColors[Math.floor(r2 * decorationColors.length)];
        scale = 0.6 + r3 * 0.4;
      } else {
        // 糖果棒使用自定义糖果颜色
        color = r2 > 0.5 ? colors.candy1 : colors.candy2;
        scale = 0.7 + r3 * 0.3;
      }

      const rotationSpeed = {
        x: (r3 - 0.5) * 2.0,
        y: (r4 - 0.5) * 2.0,
        z: (r5 - 0.5) * 2.0
      };
      
      // 闪烁参数：飞机灯效果 - 大部分时间暗，突然闪一下
      const twinkleInterval = 1.5 + r6 * 2.5; // 闪烁间隔 1.5-4秒
      const twinklePhase = r7 * 10; // 随机相位偏移（秒），让闪烁不同步
      const twinkleIntensity = 0.8 + r6 * 0.4; // 闪烁时的亮度 0.8-1.2
      
      return {
        type,
        targetPos,
        color,
        scale,
        gatherDelay,
        chaosRotation: new THREE.Euler(r3 * Math.PI, r4 * Math.PI, r5 * Math.PI),
        rotationSpeed,
        twinkleInterval,
        twinklePhase,
        twinkleIntensity
      };
    });
  }, [count, gatherShape, decorationColors, colors, actualHeight, actualRadius, enabledTypes]);
  
  // 时间累计（用于闪烁动画）
  const timeRef = useRef(0);

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
      // 将当前位置保存为起点
      currentChaosRef.current = currentChaosRef.current.map((pos, i) => {
        const newPos = pos.clone();
        // 如果正在过渡中，使用插值后的位置
        if (chaosTransitionRef.current < 1) {
          newPos.lerp(targetChaosRef.current[i], chaosTransitionRef.current);
        }
        return newPos;
      });
      // 设置新的目标位置
      targetChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      chaosTransitionRef.current = 0;
      prevScatterShapeRef.current = scatterShape;
    }
  }, [scatterShape, data]);

  // 动画持续时间（秒），speed 越大越快：0.3x -> 3.3秒, 1x -> 1秒, 3x -> 0.33秒
  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // 更新时间
    timeRef.current += delta;
    const time = timeRef.current;
    
    const isFormed = state === 'FORMED';
    const targetProgress = isFormed ? 1 : 0;
    
    // 线性插值进度，基于持续时间
    const step = delta / duration;
    if (targetProgress > progressRef.current) {
      progressRef.current = Math.min(targetProgress, progressRef.current + step);
    } else if (targetProgress < progressRef.current) {
      progressRef.current = Math.max(targetProgress, progressRef.current - step);
    }
    const rawT = progressRef.current;
    
    // 更新 chaos 位置过渡（散开形状切换时的平滑过渡）
    if (chaosTransitionRef.current < 1) {
      chaosTransitionRef.current = Math.min(1, chaosTransitionRef.current + step);
    }
    
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      if (!objData) return;
      
      // 计算当前的 chaos 位置（考虑散开形状切换的过渡）
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
        // 当 rawT < delay 时，adjustedT = 0（还没开始）
        // 当 rawT >= delay 时，adjustedT 从 0 线性增长到 1
        const adjustedT = Math.max(0, Math.min(1, (rawT - delay) / (1 - delay)));
        elementT = easeFn(adjustedT);
      }
      
      // 使用缓动函数插值位置（从动画中的 chaos 位置到目标位置）
      child.position.lerpVectors(animatedChaosPos, objData.targetPos, elementT);
      
      // 计算闪烁：飞机灯效果 - 大部分时间暗，突然闪一下
      // 使用 fmod 计算当前在闪烁周期中的位置
      const cycleTime = (time + objData.twinklePhase) % objData.twinkleInterval;
      // 闪烁持续时间很短（0.08秒），其余时间暗
      const flashDuration = 0.08;
      const isFlashing = cycleTime < flashDuration;
      // 闪烁时快速亮起然后衰减
      const flashProgress = isFlashing ? cycleTime / flashDuration : 0;
      // 使用指数衰减让闪烁更锐利：快速亮起，快速暗下
      const flashIntensity = isFlashing 
        ? Math.pow(1 - flashProgress, 0.5) * objData.twinkleIntensity 
        : 0;
      
      // 如果是精灵（图片），让它面向相机并更新闪烁
      if (child instanceof THREE.Sprite) {
        // Sprite 自动面向相机
        const spriteMat = child.material as THREE.SpriteMaterial;
        // 基础透明度 + 闪烁时的额外亮度
        spriteMat.opacity = 0.85 + flashIntensity * 0.15;
      } else {
        // 普通 mesh 继续旋转
        child.rotation.x += delta * objData.rotationSpeed.x * 0.5;
        child.rotation.y += delta * objData.rotationSpeed.y * 0.5;
        child.rotation.z += delta * objData.rotationSpeed.z * 0.5;
        
        // 更新闪烁发光效果：平时暗，闪烁时突然亮
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && mat.emissiveIntensity !== undefined) {
          // 基础发光很低，闪烁时突然变亮
          mat.emissiveIntensity = 0.15 + flashIntensity;
        }
      }
    });
  });

  // 判断某个类型是否使用自定义图片
  const useCustomImage = (type: number) => {
    if (type === 0 && textures.box) return true;
    if (type === 1 && textures.sphere) return true;
    if (type === 2 && textures.cylinder) return true;
    return false;
  };

  const getTexture = (type: number) => {
    if (type === 0) return textures.box;
    if (type === 1) return textures.sphere;
    return textures.cylinder;
  };

  // 获取初始位置（用于渲染）
  const getInitialPosition = (index: number) => {
    if (currentChaosRef.current[index]) {
      return currentChaosRef.current[index].clone();
    }
    return generateScatterPosition(scatterShape, index);
  };

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        const initialPos = getInitialPosition(i);
        
        // 使用自定义图片
        if (useCustomImage(obj.type)) {
          const texture = getTexture(obj.type);
          return (
            <sprite 
              key={i} 
              position={initialPos}
              scale={[obj.scale * 1.5, obj.scale * 1.5, 1]}
            >
              <spriteMaterial 
                map={texture} 
                transparent 
                depthWrite={false}
                opacity={0.95}
              />
            </sprite>
          );
        }
        
        // 使用默认几何体
        let geometry;
        if (obj.type === 0) geometry = boxGeometry;
        else if (obj.type === 1) geometry = sphereGeometry;
        else geometry = caneGeometry;
        
        return (
          <mesh 
            key={i} 
            position={initialPos}
            scale={[obj.scale, obj.scale, obj.scale]} 
            geometry={geometry} 
            rotation={obj.chaosRotation}
          >
            <meshStandardMaterial color={obj.color} roughness={0.3} metalness={0.4} emissive={obj.color} emissiveIntensity={0.2} />
          </mesh>
        );
      })}
    </group>
  );
};
