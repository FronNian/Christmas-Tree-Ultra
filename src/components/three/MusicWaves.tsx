import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MusicWavesConfig, SceneState } from '../../types';

interface MusicWavesProps {
  config?: MusicWavesConfig;
  state?: SceneState;
  treeHeight?: number;
  audioLevelRef?: React.MutableRefObject<number | undefined>;
}

const SEGMENTS = 96;

export const MusicWaves = ({
  config,
  state = 'FORMED',
  treeHeight = 22,
  audioLevelRef
}: MusicWavesProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const transitionRef = useRef(1); // 0=散开, 1=聚合

  const {
    enabled = true,
    color = '#FFD700',
    secondaryColor = '#FFFFFF',
    lineCount = 3,
    radius = 14,
    width = 0.08,
    baseAmplitude = 0.25,
    musicStrength = 1.0,
    speed = 1.0
  } = config || {};

  const lines = Math.max(1, Math.min(6, lineCount));

  const lineRefs = useRef<THREE.Line[]>([]);

  const geometries = useMemo(() => {
    return new Array(lines).fill(0).map(() => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array((SEGMENTS + 1) * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return geo;
    });
  }, [lines]);

  const materials = useMemo(() => {
    return new Array(lines).fill(0).map((_, i) => {
      return new THREE.LineBasicMaterial({
        color: i === lines - 1 ? secondaryColor : color,
        transparent: true,
        opacity: 0.7,
        linewidth: width,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
    });
  }, [lines, color, secondaryColor, width]);

  useFrame((frameState, delta) => {
    if (!groupRef.current) return;
    if (!enabled) return;

    const time = frameState.clock.getElapsedTime();
    const isFormed = state === 'FORMED';
    const targetTransition = isFormed ? 1 : 0;
    
    // 平滑过渡
    transitionRef.current += (targetTransition - transitionRef.current) * delta * 2;
    const transition = transitionRef.current;

    const level = Math.max(0, Math.min(1, audioLevelRef?.current ?? 0));
    const amplitude = baseAmplitude + level * musicStrength;

    groupRef.current.position.set(0, -treeHeight / 2 - 0.2, 0);

    geometries.forEach((geo, index) => {
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;

      // 聚合状态的半径
      const formedRadius = radius + index * 0.6;
      // 散开状态的半径（扩散到更大范围）
      const chaosRadius = radius * (2.5 + index * 0.8);
      
      // 插值半径
      const lineRadius = chaosRadius + (formedRadius - chaosRadius) * transition;
      
      const phase = (index / lines) * Math.PI * 2;

      for (let i = 0; i <= SEGMENTS; i++) {
        const u = i / SEGMENTS;
        
        // 聚合状态的角度（正常旋转）
        const formedAngle = u * Math.PI * 2 + phase + time * speed * 0.3;
        
        // 散开状态的角度（添加随机偏移，形成螺旋扩散效果）
        const chaosPhase = phase + index * Math.PI * 0.5 + time * speed * 0.1;
        const chaosAngle = u * Math.PI * 2 + chaosPhase + u * Math.PI * 1.5;
        
        // 插值角度
        const angle = chaosAngle + (formedAngle - chaosAngle) * transition;

        const wave = Math.sin(u * Math.PI * 4 + time * speed + index) * amplitude;
        const localRadius = lineRadius + wave;

        const x = localRadius * Math.cos(angle);
        const z = localRadius * Math.sin(angle);

        // Y 轴波动（聚合时较小，散开时较大）
        const formedYWave = Math.sin(u * Math.PI * 2 + time * (0.5 + index * 0.2)) * amplitude * 0.5;
        const chaosYWave = Math.sin(u * Math.PI * 3 + time * (0.8 + index * 0.3)) * amplitude * 1.2;
        const yWave = chaosYWave + (formedYWave - chaosYWave) * transition;
        const y = yWave;

        const idx = i * 3;
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
      }

      posAttr.needsUpdate = true;
    });
  });

  // 创建 Line 对象
  useEffect(() => {
    lineRefs.current = geometries.map((geo, i) => {
      return new THREE.Line(geo, materials[i]);
    });
    
    lineRefs.current.forEach(line => {
      groupRef.current?.add(line);
    });

    return () => {
      lineRefs.current.forEach(line => {
        groupRef.current?.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      lineRefs.current = [];
    };
  }, [geometries, materials]);

  if (!enabled) return null;

  return <group ref={groupRef} />;
};


