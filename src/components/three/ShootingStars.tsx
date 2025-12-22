
import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { ShootingStarsConfig } from '../../types';

interface ShootingStar {
  id: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  progress: number;
  speed: number;
  trailPositions: THREE.Vector3[];
  size: number;
  brightness: number;
}

interface ShootingStarsProps {
  config: ShootingStarsConfig;
}

export const ShootingStars = ({ config }: ShootingStarsProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [stars, setStars] = useState<ShootingStar[]>([]);
  const nextSpawnRef = useRef(0);
  const starIdRef = useRef(0);
  const timeRef = useRef(0);
  
  // 流星拖尾段数
  const trailSegments = 30;
  
  // 生成随机生成间隔
  const getRandomInterval = () => {
    const [min, max] = config.frequency;
    return (min + Math.random() * (max - min)) * 0.4;
  };
  
  // 生成新流星
  const spawnStar = (): ShootingStar => {
    const region = Math.random();
    
    let startX: number, startY: number, startZ: number;
    let endX: number, endY: number, endZ: number;
    
    if (region < 0.4) {
      startX = -200 - Math.random() * 100;
      startY = 150 + Math.random() * 100;
      startZ = -150 - Math.random() * 100;
      
      endX = startX + 180 + Math.random() * 80;
      endY = startY - 120 - Math.random() * 60;
      endZ = startZ + 60 + Math.random() * 40;
    } else if (region < 0.7) {
      startX = 100 + Math.random() * 150;
      startY = 160 + Math.random() * 80;
      startZ = -180 - Math.random() * 80;
      
      endX = startX - 150 - Math.random() * 60;
      endY = startY - 130 - Math.random() * 50;
      endZ = startZ + 50 + Math.random() * 30;
    } else if (region < 0.85) {
      startX = -50 + Math.random() * 100;
      startY = 200 + Math.random() * 80;
      startZ = -200 - Math.random() * 100;
      
      endX = startX + (Math.random() - 0.5) * 100;
      endY = startY - 150 - Math.random() * 50;
      endZ = startZ + 80 + Math.random() * 40;
    } else {
      startX = -100 + Math.random() * 200;
      startY = 140 + Math.random() * 100;
      startZ = -250 - Math.random() * 100;
      
      endX = startX + (Math.random() - 0.5) * 120;
      endY = startY - 100 - Math.random() * 60;
      endZ = startZ + 100 + Math.random() * 50;
    }
    
    const startPos = new THREE.Vector3(startX, startY, startZ);
    const endPos = new THREE.Vector3(endX, endY, endZ);
    
    const trailPositions = new Array(trailSegments).fill(null).map(() => startPos.clone());
    
    const sizeRandom = Math.random();
    const size = sizeRandom < 0.7 ? 0.3 + Math.random() * 0.4 : 0.8 + Math.random() * 0.6;
    const brightness = sizeRandom < 0.7 ? 0.6 + Math.random() * 0.3 : 0.9 + Math.random() * 0.1;
    
    return {
      id: starIdRef.current++,
      startPos,
      endPos,
      progress: 0,
      speed: config.speed * (0.6 + Math.random() * 0.8),
      trailPositions,
      size,
      brightness
    };
  };
  
  useEffect(() => {
    nextSpawnRef.current = timeRef.current + getRandomInterval();
    const initialStars: ShootingStar[] = [];
    const initialCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < initialCount; i++) {
      const star = spawnStar();
      star.progress = Math.random() * 0.3;
      initialStars.push(star);
    }
    setStars(initialStars);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.frequency]);
  
  useFrame((_, delta) => {
    if (!config.enabled) return;
    
    timeRef.current += delta;
    
    if (timeRef.current >= nextSpawnRef.current) {
      const spawnCount = Math.random() < 0.3 ? (Math.random() < 0.5 ? 2 : 3) : 1;
      const newStars: ShootingStar[] = [];
      for (let i = 0; i < spawnCount; i++) {
        newStars.push(spawnStar());
      }
      setStars(prev => [...prev, ...newStars]);
      nextSpawnRef.current = timeRef.current + getRandomInterval();
    }
    
    setStars(prev => {
      if (prev.length === 0) return prev;

      return prev
        .map(star => {
          const newProgress = star.progress + delta * star.speed * 0.5;
          const currentPos = new THREE.Vector3().lerpVectors(
            star.startPos,
            star.endPos,
            Math.min(newProgress, 1)
          );
          
          const newTrailPositions = [...star.trailPositions];
          for (let i = newTrailPositions.length - 1; i > 0; i--) {
            const lerpFactor = 0.15 * config.trailLength;
            newTrailPositions[i].lerp(newTrailPositions[i - 1], lerpFactor);
          }
          newTrailPositions[0].copy(currentPos);
          
          return {
            ...star,
            progress: newProgress,
            trailPositions: newTrailPositions
          };
        })
        .filter(star => star.progress < 1.3);
    });
  });
  
  if (!config.enabled) return null;

  return (
    <group ref={groupRef}>
      {stars.map(star => {
        const currentPos = new THREE.Vector3().lerpVectors(
          star.startPos,
          star.endPos,
          Math.min(star.progress, 1)
        );
        
        const headOpacity = star.progress > 0.7 
          ? 1 - (star.progress - 0.7) / 0.3 
          : 1;
        
        const finalOpacity = headOpacity * star.brightness;
        
        return (
          <group key={star.id}>
            <mesh position={currentPos}>
              <sphereGeometry args={[star.size * 0.8, 8, 8]} />
              <meshBasicMaterial 
                color={config.color}
                transparent
                opacity={finalOpacity * config.glowIntensity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            
            <mesh position={currentPos}>
              <sphereGeometry args={[star.size * 2.5, 8, 8]} />
              <meshBasicMaterial 
                color={config.color}
                transparent
                opacity={finalOpacity * 0.25 * config.glowIntensity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            
            <mesh position={currentPos}>
              <sphereGeometry args={[star.size * 4, 8, 8]} />
              <meshBasicMaterial 
                color={config.color}
                transparent
                opacity={finalOpacity * 0.1 * config.glowIntensity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            
            <Line
              points={star.trailPositions}
              color={config.color}
              lineWidth={Math.max(1, star.size * 3)}
              transparent
              opacity={0.6 * finalOpacity * config.glowIntensity}
            />
          </group>
        );
      })}
    </group>
  );
};
