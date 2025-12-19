import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FallingRibbonsProps {
  count?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ['#FFD700', '#D32F2F', '#ECEFF1', '#FF69B4', '#00CED1'];

export const FallingRibbons = ({ count = 50, colors }: FallingRibbonsProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const ribbonColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;

  const ribbons = useMemo(() => {
    const items: {
      pos: THREE.Vector3;
      velocity: THREE.Vector3;
      rotation: number;
      rotSpeed: number;
      color: string;
      scale: number;
    }[] = [];
    const colorList = ribbonColors;

    for (let i = 0; i < count; i++) {
      items.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 80,
          30 + Math.random() * 40,
          (Math.random() - 0.5) * 80
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          -(0.5 + Math.random() * 1),
          (Math.random() - 0.5) * 0.5
        ),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3,
        color: colorList[Math.floor(Math.random() * colorList.length)],
        scale: 0.3 + Math.random() * 0.5
      });
    }
    return items;
  }, [count, ribbonColors]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;

    groupRef.current.children.forEach((child, i) => {
      const ribbon = ribbons[i];

      ribbon.pos.x += ribbon.velocity.x * delta + Math.sin(time + i) * 0.02;
      ribbon.pos.y += ribbon.velocity.y * delta;
      ribbon.pos.z += ribbon.velocity.z * delta + Math.cos(time + i) * 0.02;
      ribbon.rotation += ribbon.rotSpeed * delta;

      if (ribbon.pos.y < -30) {
        ribbon.pos.y = 40 + Math.random() * 20;
        ribbon.pos.x = (Math.random() - 0.5) * 80;
        ribbon.pos.z = (Math.random() - 0.5) * 80;
      }

      child.position.copy(ribbon.pos);
      child.rotation.set(
        Math.sin(time * 2 + i) * 0.5,
        ribbon.rotation,
        Math.cos(time * 1.5 + i) * 0.3
      );
    });
  });

  return (
    <group ref={groupRef}>
      {ribbons.map((ribbon, i) => (
        <mesh key={i} position={ribbon.pos} scale={ribbon.scale}>
          <planeGeometry args={[0.3, 2, 1, 8]} />
          <meshStandardMaterial
            color={ribbon.color}
            side={THREE.DoubleSide}
            roughness={0.3}
            metalness={0.5}
            emissive={ribbon.color}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};
