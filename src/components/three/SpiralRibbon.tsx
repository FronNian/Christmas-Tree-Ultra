import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState, AnimationEasing } from '../../types';

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

// 创建螺旋几何体
const createSpiralGeometry = (
  turns: number, 
  width: number, 
  angleOffset: number = 0,
  treeHeight: number = CONFIG.tree.height,
  baseRadius: number = CONFIG.tree.radius
) => {
  const ribbonThickness = 0.1;
  const segments = 200;
  
  const shape = new THREE.Shape();
  shape.moveTo(0, -width / 2);
  shape.lineTo(ribbonThickness, -width / 2);
  shape.lineTo(ribbonThickness, width / 2);
  shape.lineTo(0, width / 2);
  shape.closePath();

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * turns + angleOffset;
    const y = t * treeHeight - treeHeight / 2 + 1;
    const radiusAtHeight = baseRadius * (1 - t * 0.85) + 1;
    const x = Math.cos(angle) * radiusAtHeight;
    const z = Math.sin(angle) * radiusAtHeight;
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.ExtrudeGeometry(shape, {
    steps: segments,
    bevelEnabled: false,
    extrudePath: curve,
  });
};

interface SpiralRibbonProps {
  state: SceneState;
  color?: string;
  glowColor?: string;
  width?: number;
  turns?: number;
  double?: boolean;
  secondColor?: string;
  secondGlowColor?: string;
  easing?: AnimationEasing;
  speed?: number;
  treeHeight?: number;
  treeRadius?: number;
}

export const SpiralRibbon = ({ 
  state, 
  color = '#FF4444',
  glowColor = '#FF6666',
  width = 0.8,
  turns = 5,
  double = false,
  secondColor = '#FFD700',
  secondGlowColor = '#FFEC8B',
  easing = 'easeInOut',
  speed = 1,
  treeHeight,
  treeRadius
}: SpiralRibbonProps) => {
  const ribbonRef = useRef<THREE.Mesh>(null);
  const ribbon2Ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const material2Ref = useRef<THREE.MeshStandardMaterial>(null);
  const progressRef = useRef(0);

  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;

  // 创建螺旋丝带几何体
  const ribbonGeometry = useMemo(() => {
    return createSpiralGeometry(turns, width, 0, actualHeight, actualRadius);
  }, [turns, width, actualHeight, actualRadius]);

  // 第二条螺旋（双层时使用，偏移半圈）
  const ribbon2Geometry = useMemo(() => {
    if (!double) return null;
    return createSpiralGeometry(turns, width, Math.PI, actualHeight, actualRadius);
  }, [turns, width, double, actualHeight, actualRadius]);

  // 清理资源：在组件卸载时释放 geometry
  useEffect(() => {
    return () => {
      ribbonGeometry.dispose();
      if (ribbon2Geometry) {
        ribbon2Geometry.dispose();
      }
    };
  }, [ribbonGeometry, ribbon2Geometry]);

  // 动画持续时间（秒），speed 越大越快
  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;

  useFrame((frameState, delta) => {
    // 动画进度
    const targetProgress = state === 'FORMED' ? 1 : 0;
    
    // 线性插值进度，基于持续时间
    const step = delta / duration;
    if (targetProgress > progressRef.current) {
      progressRef.current = Math.min(targetProgress, progressRef.current + step);
    } else if (targetProgress < progressRef.current) {
      progressRef.current = Math.max(targetProgress, progressRef.current - step);
    }
    const t = easeFn(progressRef.current);

    if (ribbonRef.current) {
      ribbonRef.current.scale.setScalar(Math.max(0.01, t));
    }
    if (ribbon2Ref.current) {
      ribbon2Ref.current.scale.setScalar(Math.max(0.01, t));
    }

    // 发光脉冲
    const time = frameState.clock.elapsedTime;
    const pulse = 0.8 + Math.sin(time * 3) * 0.2;
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = pulse * t;
    }
    if (material2Ref.current) {
      material2Ref.current.emissiveIntensity = pulse * t;
    }
  });

  return (
    <group>
      <mesh ref={ribbonRef} geometry={ribbonGeometry}>
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={glowColor}
          emissiveIntensity={0.8}
          roughness={0.3}
          metalness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {double && ribbon2Geometry && (
        <mesh ref={ribbon2Ref} geometry={ribbon2Geometry}>
          <meshStandardMaterial
            ref={material2Ref}
            color={secondColor}
            emissive={secondGlowColor}
            emissiveIntensity={0.8}
            roughness={0.3}
            metalness={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
