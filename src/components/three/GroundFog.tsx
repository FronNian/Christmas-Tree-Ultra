import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';

interface GroundFogProps {
  opacity?: number;
  color?: string;
}

export const GroundFog = ({ opacity = 0.3, color = '#ffffff' }: GroundFogProps) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.05;
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * (0.8 + Math.sin(time * 0.5) * 0.2);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -CONFIG.tree.height / 2 - 3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[30, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
