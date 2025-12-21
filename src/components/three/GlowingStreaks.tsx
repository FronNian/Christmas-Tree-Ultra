import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState } from '../../types';

interface Streak {
  angle: number;        // 当前角度
  height: number;       // 当前高度
  speed: number;        // 旋转速度
  heightSpeed: number;  // 上升速度
  radius: number;       // 半径偏移
  tailLength: number;   // 拖尾长度（弧度）
  delay: number;        // 延迟启动
  // 散开状态
  chaosAngle: number;
  chaosHeight: number;
  chaosRadius: number;
}

interface GlowingStreaksProps {
  state?: SceneState;
  count?: number;
  color?: string;
  speed?: number;
  tailLength?: number;
  lineWidth?: number;
  treeHeight?: number;
  treeRadius?: number;
}

export const GlowingStreaks = ({
  state = 'FORMED',
  count = 5,
  color = '#FFD700',
  speed = 1,
  tailLength = 1.2,
  lineWidth = 3,
  treeHeight: propTreeHeight,
  treeRadius: propTreeRadius
}: GlowingStreaksProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const tubeRefs = useRef<THREE.Mesh[]>([]);
  const transitionRef = useRef(1); // 0=散开, 1=聚合

  const treeHeight = propTreeHeight ?? CONFIG.tree.height;
  const baseRadius = propTreeRadius ?? CONFIG.tree.radius;

  // 初始化流线数据
  const streaksData = useRef<Streak[]>([]);
  
  useMemo(() => {
    streaksData.current = [];
    for (let i = 0; i < count; i++) {
      streaksData.current.push({
        angle: (i / count) * Math.PI * 2 + Math.random() * 0.5,
        height: Math.random(),
        speed: (0.6 + Math.random() * 0.4) * speed,
        heightSpeed: (0.08 + Math.random() * 0.06) * speed,
        radius: 1.0 + Math.random() * 0.2,
        tailLength: tailLength * (0.7 + Math.random() * 0.6),
        delay: i * 0.5,
        // 散开时的随机位置
        chaosAngle: Math.random() * Math.PI * 2,
        chaosHeight: Math.random() * 2 - 0.5,
        chaosRadius: 2.5 + Math.random() * 2
      });
    }
  }, [count, speed, tailLength]);

  // 创建管道几何体的函数
  const createTubeGeometry = (points: THREE.Vector3[], radius: number) => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, 32, radius, 8, false);
  };

  useFrame((frameState, delta) => {
    const time = frameState.clock.elapsedTime;
    const isFormed = state === 'FORMED';
    const targetTransition = isFormed ? 1 : 0;
    
    // 平滑过渡
    transitionRef.current += (targetTransition - transitionRef.current) * delta * 2;
    const t = transitionRef.current;
    
    streaksData.current.forEach((streak, i) => {
      // 延迟启动（仅聚合时）
      if (t > 0.5 && time < streak.delay) return;
      
      // 更新角度和高度（聚合时正常运动）
      if (t > 0.3) {
        streak.angle += streak.speed * 0.015 * t;
        streak.height += streak.heightSpeed * 0.008 * t;
        
        // 循环：到达顶部后重新从底部开始
        if (streak.height > 1.1) {
          streak.height = -0.1;
          streak.angle = Math.random() * Math.PI * 2;
        }
      }
      
      // 散开时更新混沌角度（缓慢旋转）
      streak.chaosAngle += 0.003 * (1 - t);
      
      const tube = tubeRefs.current[i];
      if (!tube) return;
      
      // 生成弧形路径点
      const points: THREE.Vector3[] = [];
      const segments = 24;
      
      for (let j = 0; j <= segments; j++) {
        const segT = j / segments;
        
        // 聚合状态的位置
        const formedAngle = streak.angle - segT * streak.tailLength;
        const formedHeight = streak.height - segT * 0.15;
        const clampedFormedHeight = Math.max(0, Math.min(1, formedHeight));
        const formedRadius = (baseRadius * (1 - clampedFormedHeight * 0.82) + 0.8) * streak.radius;
        
        const formedX = Math.cos(formedAngle) * formedRadius;
        const formedY = clampedFormedHeight * treeHeight - treeHeight / 2 + 1;
        const formedZ = Math.sin(formedAngle) * formedRadius;
        
        // 散开状态的位置（扩散到更大范围，形成螺旋）
        const chaosAngle = streak.chaosAngle + segT * Math.PI * 0.5;
        const chaosHeight = streak.chaosHeight + segT * 0.3;
        const chaosRadius = baseRadius * streak.chaosRadius * (1 + segT * 0.5);
        
        const chaosX = Math.cos(chaosAngle) * chaosRadius;
        const chaosY = chaosHeight * treeHeight - treeHeight / 2;
        const chaosZ = Math.sin(chaosAngle) * chaosRadius;
        
        // 插值
        const x = chaosX + (formedX - chaosX) * t;
        const y = chaosY + (formedY - chaosY) * t;
        const z = chaosZ + (formedZ - chaosZ) * t;
        
        points.push(new THREE.Vector3(x, y, z));
      }
      
      // 更新几何体
      const newGeometry = createTubeGeometry(points, lineWidth * 0.02);
      if (newGeometry && tube.geometry) {
        tube.geometry.dispose();
        tube.geometry = newGeometry;
      }
      
      // 更新透明度
      const material = tube.material as THREE.MeshBasicMaterial;
      if (material) {
        const pulse = 0.7 + 0.3 * Math.sin(time * 4 + i);
        // 散开时也保持可见
        const baseOpacity = t > 0.5 
          ? (streak.height > 0 && streak.height < 1 ? 1 : 0.3)
          : 0.7;
        material.opacity = pulse * baseOpacity;
      }
    });
  });

  const baseColor = new THREE.Color(color);

  // 清理资源：在组件卸载时释放所有 tube 几何体
  useEffect(() => {
    return () => {
      tubeRefs.current.forEach(tube => {
        if (tube?.geometry) {
          tube.geometry.dispose();
        }
        if (tube?.material) {
          (tube.material as THREE.Material).dispose();
        }
      });
    };
  }, []);

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh 
          key={i} 
          ref={el => { if (el) tubeRefs.current[i] = el; }}
        >
          <tubeGeometry args={[
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(1, 1, 0)
            ]), 8, lineWidth * 0.02, 8, false
          ]} />
          <meshBasicMaterial
            color={baseColor}
            transparent={true}
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
};
