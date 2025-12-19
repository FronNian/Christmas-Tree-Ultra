import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { CONFIG } from '../../config';
import { isMobile } from '../../utils/helpers';
import type { SceneState, PhotoScreenPosition, AnimationEasing, ScatterShape, GatherShape } from '../../types';

// 全局变量存储照片位置，用于捏合选择
export let photoScreenPositions: PhotoScreenPosition[] = [];

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
      const r = 25 + r3 * 30;
      return new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    case 'spiral': {
      const t = r1;
      const angle = t * Math.PI * 10;
      const radius = 10 + t * 30 + r2 * 6;
      const y = -25 + t * 60 + (r3 - 0.5) * 10;
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
    case 'rain': {
      return new THREE.Vector3(
        (r1 - 0.5) * 70,
        30 + r2 * 40,
        (r3 - 0.5) * 70
      );
    }
    case 'ring': {
      const angle = r1 * Math.PI * 2;
      const radius = 25 + r2 * 12;
      const y = (r3 - 0.5) * 18;
      return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
    }
    case 'sphere':
    default:
      return new THREE.Vector3(
        (r1 - 0.5) * 70,
        (r2 - 0.5) * 70,
        (r3 - 0.5) * 70
      );
  }
};

// 生成目标位置
const generateTargetPosition = (index: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 5 + 100);
  const r2 = seededRandom(index * 5 + 101);
  const h = CONFIG.tree.height;
  const y = (r1 * h) - (h / 2);
  const rBase = CONFIG.tree.radius;
  const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) + 0.5;
  const theta = r2 * Math.PI * 2;
  return new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
};

// 根据聚合形状计算延迟（0-1范围，值越大越晚开始动画）
const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape): number => {
  const normalizedY = (targetPos.y + CONFIG.tree.height / 2) / CONFIG.tree.height; // 0=底部, 1=顶部
  const normalizedX = (targetPos.x + CONFIG.tree.radius) / (2 * CONFIG.tree.radius);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / CONFIG.tree.radius;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  
  switch (shape) {
    case 'stack': 
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

interface PhotoOrnamentsProps {
  state: SceneState;
  selectedIndex: number | null;
  onPhotoClick?: (index: number | null) => void;
  photoPaths: string[];
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  photoScale?: number;      // 照片大小倍数
  frameColor?: string;      // 相框颜色
}

export const PhotoOrnaments = ({ 
  state, 
  selectedIndex, 
  onPhotoClick, 
  photoPaths,
  easing = 'easeInOut',
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct',
  photoScale = 1.5,
  frameColor = '#FFFFFF'
}: PhotoOrnamentsProps) => {
  const textures = useTexture(photoPaths);
  const count = photoPaths.length;
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  
  // 存储当前动画中的 chaos 位置
  const currentChaosRef = useRef<THREE.Vector3[]>([]);
  const targetChaosRef = useRef<THREE.Vector3[]>([]);
  const chaosTransitionRef = useRef(1);
  const prevScatterShapeRef = useRef(scatterShape);

  useMemo(() => {
    textures.forEach((texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    });
  }, [textures]);

  // 相框样式：照片 + 外框 + 内衬
  const photoSize = 1 * photoScale;
  const innerBorder = 0.03 * photoScale; // 内衬宽度（深色）
  const outerBorder = 0.08 * photoScale; // 外框宽度
  const innerSize = photoSize + innerBorder * 2;
  const frameSize = innerSize + outerBorder * 2;
  const photoGeometry = useMemo(
    () => new THREE.PlaneGeometry(photoSize, photoSize),
    [photoSize]
  );
  const innerGeometry = useMemo(
    () => new THREE.PlaneGeometry(innerSize, innerSize),
    [innerSize]
  );
  const frameGeometry = useMemo(
    () => new THREE.PlaneGeometry(frameSize, frameSize),
    [frameSize]
  );
  // 计算内衬颜色（比相框颜色深一点）
  const innerColor = useMemo(() => {
    const color = new THREE.Color(frameColor);
    color.multiplyScalar(0.7); // 变暗30%
    return '#' + color.getHexString();
  }, [frameColor]);

  // 基础数据（不依赖 scatterShape）
  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const targetPos = generateTargetPosition(i);
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape);

      const r1 = seededRandom(i * 6 + 200);
      const r2 = seededRandom(i * 6 + 201);
      const r3 = seededRandom(i * 6 + 202);
      const r4 = seededRandom(i * 6 + 203);
      const r5 = seededRandom(i * 6 + 204);
      const r6 = seededRandom(i * 6 + 205);

      const isBig = r1 < 0.2;
      const baseScale = isBig ? 2.2 : 0.8 + r2 * 0.6;
      const weight = 0.8 + r3 * 1.2;
      const borderColor = CONFIG.colors.borders[Math.floor(r4 * CONFIG.colors.borders.length)];

      return {
        targetPos,
        scale: baseScale,
        weight,
        textureIndex: i % textures.length,
        borderColor,
        gatherDelay,
        currentPos: new THREE.Vector3(),
        currentScale: baseScale,
        chaosRotation: new THREE.Euler(r3 * Math.PI, r4 * Math.PI, r5 * Math.PI),
        rotationSpeed: { x: (r3 - 0.5) * 1.0, y: (r4 - 0.5) * 1.0, z: (r5 - 0.5) * 1.0 },
        wobbleOffset: r5 * 10,
        wobbleSpeed: 0.5 + r6 * 0.5
      };
    });
  }, [textures, count, gatherShape]);

  // 初始化 chaos 位置
  useEffect(() => {
    if (currentChaosRef.current.length !== count) {
      currentChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      targetChaosRef.current = currentChaosRef.current.map(p => p.clone());
      // 初始化 currentPos
      data.forEach((d, i) => d.currentPos.copy(currentChaosRef.current[i]));
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
    const camera = stateObj.camera;
    
    // 更新动画进度
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

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      if (!objData) return;
      
      const isSelected = selectedIndex === i;
      
      // 计算当前的 chaos 位置
      const currentChaos = currentChaosRef.current[i];
      const targetChaos = targetChaosRef.current[i];
      
      // 安全检查：如果 chaos 位置未初始化，跳过
      if (!currentChaos || !targetChaos) return;
      
      const chaosT = easeFn(chaosTransitionRef.current);
      const animatedChaosPos = currentChaos.clone().lerp(targetChaos, chaosT);

      let targetScale: number;

      if (isSelected) {
        // 图片移动到相机正前方（选中时使用直接 lerp）
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        // 移动端距离更近，桌面端稍远
        const mobile = isMobile();
        const distance = mobile ? 20 : 28;
        const target = camera.position.clone().add(cameraDir.multiplyScalar(distance));
        // 选中时的缩放：移动端适中，桌面端稍大
        targetScale = mobile ? 6 : 8;
        objData.currentPos.lerp(target, delta * 8);
        group.position.copy(objData.currentPos);
      } else {
        // 基于延迟的进度计算：delay 越大，开始动画越晚
        const delay = objData.gatherDelay;
        let elementT: number;
        if (delay === 0) {
          elementT = easeFn(rawT);
        } else {
          const adjustedT = Math.max(0, Math.min(1, (rawT - delay) / (1 - delay)));
          elementT = easeFn(adjustedT);
        }
        targetScale = objData.scale;
        group.position.lerpVectors(animatedChaosPos, objData.targetPos, elementT);
        objData.currentPos.copy(group.position);
      }

      if (!isSelected) {
        const screenPos = objData.currentPos.clone().project(camera);
        const screenX = (1 - screenPos.x) / 2;
        const screenY = (1 - screenPos.y) / 2;
        if (screenPos.z < 1 && screenX >= 0 && screenX <= 1 && screenY >= 0 && screenY <= 1) {
          photoScreenPositions[i] = { index: i, x: screenX, y: screenY };
        }
      }

      objData.currentScale = MathUtils.lerp(objData.currentScale, targetScale, delta * 3);
      group.scale.setScalar(objData.currentScale);

      if (isSelected) {
        group.lookAt(camera.position);
        group.rotation.y += Math.sin(time * 2) * 0.03;
      } else if (isFormed) {
        const targetLookPos = new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2);
        group.lookAt(targetLookPos);
        group.rotation.x += Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
        group.rotation.z += Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
      } else {
        group.rotation.x += delta * objData.rotationSpeed.x;
        group.rotation.y += delta * objData.rotationSpeed.y;
        group.rotation.z += delta * objData.rotationSpeed.z;
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
        <group
          key={i}
          position={getInitialPosition(i)}
          scale={[obj.scale, obj.scale, obj.scale]}
          rotation={state === 'CHAOS' ? obj.chaosRotation : [0, 0, 0]}
          onClick={() => onPhotoClick?.(selectedIndex === i ? null : i)}
        >
          {/* 正面 */}
          <group position={[0, 0, 0.02]}>
            {/* 外框 */}
            <mesh geometry={frameGeometry} position={[0, 0, -0.02]}>
              <meshBasicMaterial color={frameColor} side={THREE.FrontSide} />
            </mesh>
            {/* 内衬 */}
            <mesh geometry={innerGeometry} position={[0, 0, -0.01]}>
              <meshBasicMaterial color={innerColor} side={THREE.FrontSide} />
            </mesh>
            {/* 照片 */}
            <mesh geometry={photoGeometry}>
              <meshBasicMaterial
                map={textures[obj.textureIndex]}
                side={THREE.FrontSide}
                toneMapped={false}
              />
            </mesh>
          </group>
          {/* 背面 */}
          <group position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
            {/* 外框 */}
            <mesh geometry={frameGeometry} position={[0, 0, -0.02]}>
              <meshBasicMaterial color={frameColor} side={THREE.FrontSide} />
            </mesh>
            {/* 内衬 */}
            <mesh geometry={innerGeometry} position={[0, 0, -0.01]}>
              <meshBasicMaterial color={innerColor} side={THREE.FrontSide} />
            </mesh>
            {/* 照片 */}
            <mesh geometry={photoGeometry}>
              <meshBasicMaterial
                map={textures[obj.textureIndex]}
                side={THREE.FrontSide}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};
