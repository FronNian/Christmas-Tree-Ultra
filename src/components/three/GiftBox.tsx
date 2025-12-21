import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GiftBoxProps {
  boxColor?: string;
  ribbonColor?: string;
  isWaiting: boolean;
  onOpen: () => void;
  isOpen: boolean;
}

export const GiftBox = ({
  boxColor = '#D32F2F',
  ribbonColor = '#FFD700',
  isWaiting,
  onOpen,
  isOpen
}: GiftBoxProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const timeRef = useRef(0);
  const openProgressRef = useRef(0);
  
  // 礼物盒尺寸（放大）
  const scale = 2.5;
  
  // 材质
  const boxMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: boxColor,
    roughness: 0.3,
    metalness: 0.1,
    emissive: boxColor,
    emissiveIntensity: 0.1
  }), [boxColor]);
  
  const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: ribbonColor,
    roughness: 0.2,
    metalness: 0.5,
    emissive: ribbonColor,
    emissiveIntensity: 0.4
  }), [ribbonColor]);
  
  // 发光材质（等待状态）
  const glowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: ribbonColor,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
  }), [ribbonColor]);
  
  // 清理资源：在组件卸载时释放所有材质
  useEffect(() => {
    return () => {
      boxMaterial.dispose();
      ribbonMaterial.dispose();
      glowMaterial.dispose();
    };
  }, [boxMaterial, ribbonMaterial, glowMaterial]);
  
  // 动画
  useFrame((_, delta) => {
    timeRef.current += delta;
    
    if (isWaiting && !isOpen) {
      const pulse = Math.sin(timeRef.current * 3) * 0.5 + 0.5;
      glowMaterial.opacity = 0.2 + pulse * 0.4;
      ribbonMaterial.emissiveIntensity = 0.3 + pulse * 0.5;
      
      if (groupRef.current) {
        groupRef.current.position.y = Math.sin(timeRef.current * 2) * 0.3;
        groupRef.current.rotation.y += delta * 0.3;
      }
    }
    
    if (isOpen && lidRef.current) {
      openProgressRef.current = Math.min(1, openProgressRef.current + delta * 1.5);
      const progress = openProgressRef.current;
      lidRef.current.rotation.x = -progress * Math.PI * 0.8;
      lidRef.current.position.y = 1.5 * scale + progress * 1.5;
      lidRef.current.position.z = progress * 2;
    }
  });
  
  const handleClick = () => {
    if (isWaiting && !isOpen) {
      onOpen();
    }
  };
  
  return (
    <group 
      ref={groupRef}
      position={[0, 0, 0]}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <pointLight position={[0, 5 * scale, 5 * scale]} color="#FFFFFF" intensity={2} distance={30} />
      <pointLight position={[0, 2 * scale, 0]} color={ribbonColor} intensity={1} distance={15} />
      
      <mesh material={boxMaterial} position={[0, 0.75 * scale, 0]}>
        <boxGeometry args={[3 * scale, 1.5 * scale, 3 * scale]} />
      </mesh>
      
      <mesh material={ribbonMaterial} position={[0, 0.76 * scale, 0]}>
        <boxGeometry args={[3.1 * scale, 0.35 * scale, 0.5 * scale]} />
      </mesh>
      
      <mesh material={ribbonMaterial} position={[0, 0.76 * scale, 0]}>
        <boxGeometry args={[0.5 * scale, 0.35 * scale, 3.1 * scale]} />
      </mesh>
      
      <group ref={lidRef} position={[0, 1.5 * scale, 0]}>
        <mesh material={boxMaterial} position={[0, 0.15 * scale, 0]}>
          <boxGeometry args={[3.2 * scale, 0.3 * scale, 3.2 * scale]} />
        </mesh>
        
        <mesh material={ribbonMaterial} position={[0, 0.31 * scale, 0]}>
          <boxGeometry args={[3.3 * scale, 0.2 * scale, 0.5 * scale]} />
        </mesh>
        
        <mesh material={ribbonMaterial} position={[0, 0.31 * scale, 0]}>
          <boxGeometry args={[0.5 * scale, 0.2 * scale, 3.3 * scale]} />
        </mesh>
        
        <group position={[0, 0.5 * scale, 0]}>
          <mesh material={ribbonMaterial} position={[-0.5 * scale, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <torusGeometry args={[0.4 * scale, 0.12 * scale, 8, 16, Math.PI]} />
          </mesh>
          <mesh material={ribbonMaterial} position={[0.5 * scale, 0, 0]} rotation={[0, Math.PI, -Math.PI / 6]}>
            <torusGeometry args={[0.4 * scale, 0.12 * scale, 8, 16, Math.PI]} />
          </mesh>
          <mesh material={ribbonMaterial}>
            <sphereGeometry args={[0.2 * scale, 12, 12]} />
          </mesh>
          <mesh material={ribbonMaterial} position={[-0.3 * scale, -0.4 * scale, 0]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.15 * scale, 0.8 * scale, 0.05 * scale]} />
          </mesh>
          <mesh material={ribbonMaterial} position={[0.3 * scale, -0.4 * scale, 0]} rotation={[0, 0, 0.3]}>
            <boxGeometry args={[0.15 * scale, 0.8 * scale, 0.05 * scale]} />
          </mesh>
        </group>
      </group>
      
      {isWaiting && !isOpen && (
        <>
          <mesh material={glowMaterial} position={[0, 0.75 * scale, 0]}>
            <boxGeometry args={[3.8 * scale, 2.2 * scale, 3.8 * scale]} />
          </mesh>
          <mesh position={[0, 1 * scale, 0]}>
            <sphereGeometry args={[5 * scale, 16, 16]} />
            <meshBasicMaterial color={ribbonColor} transparent opacity={0.08} blending={THREE.AdditiveBlending} side={THREE.BackSide} />
          </mesh>
        </>
      )}
      
      {hovered && isWaiting && !isOpen && (
        <mesh position={[0, 0.75 * scale, 0]}>
          <boxGeometry args={[3.9 * scale, 2.3 * scale, 3.9 * scale]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
      
      {isOpen && openProgressRef.current > 0.5 && (
        <pointLight position={[0, 2 * scale, 0]} color="#FFD700" intensity={3 * (openProgressRef.current - 0.5) * 2} distance={20} />
      )}
    </group>
  );
};
