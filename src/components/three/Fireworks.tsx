import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FireworksConfig } from '../../types';

// 烟花粒子
interface FireworkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  size: number;
}

// 单个烟花
interface Firework {
  id: number;
  phase: 'rising' | 'exploding' | 'fading';
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetY: number;
  particles: FireworkParticle[];
  color: THREE.Color;
  life: number;
}

interface FireworksProps {
  config: FireworksConfig;
  trigger?: boolean;
  onTriggerConsumed?: () => void;
}

export const Fireworks = ({ config, trigger, onTriggerConsumed }: FireworksProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [fireworks, setFireworks] = useState<Firework[]>([]);
  const fireworkIdRef = useRef(0);
  const lastTriggerRef = useRef(false);
  
  // 生成随机颜色
  const getRandomColor = () => {
    const colors = config.colors;
    return new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
  };
  
  // 创建新烟花
  const createFirework = (): Firework => {
    const startX = (Math.random() - 0.5) * 60;
    const startZ = (Math.random() - 0.5) * 30 - 20;
    
    return {
      id: fireworkIdRef.current++,
      phase: 'rising',
      position: new THREE.Vector3(startX, -30, startZ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        15 + Math.random() * 10,
        (Math.random() - 0.5) * 2
      ),
      targetY: 20 + Math.random() * 30,
      particles: [],
      color: getRandomColor(),
      life: 0
    };
  };
  
  // 创建爆炸粒子
  const createExplosionParticles = (
    position: THREE.Vector3, 
    color: THREE.Color
  ): FireworkParticle[] => {
    const particles: FireworkParticle[] = [];
    const count = config.particleCount;
    
    for (let i = 0; i < count; i++) {
      // 球形分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (0.5 + Math.random() * 0.5) * config.explosionSize * 0.5;
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      
      // 颜色变化
      const particleColor = color.clone();
      if (Math.random() > 0.7) {
        // 30% 的粒子使用不同颜色
        particleColor.setHSL(
          (color.getHSL({ h: 0, s: 0, l: 0 }).h + Math.random() * 0.2 - 0.1) % 1,
          0.8 + Math.random() * 0.2,
          0.5 + Math.random() * 0.3
        );
      }
      
      particles.push({
        position: position.clone(),
        velocity,
        color: particleColor,
        life: 1,
        maxLife: 1 + Math.random() * 0.5,
        size: 0.3 + Math.random() * 0.3
      });
    }
    
    return particles;
  };
  
  // 处理触发
  useEffect(() => {
    if (trigger && !lastTriggerRef.current && config.enabled) {
      // 检查并发限制
      const activeCount = fireworks.filter(f => f.phase !== 'fading' || f.life < 2).length;
      if (activeCount < config.maxConcurrent) {
        setFireworks(prev => [...prev, createFirework()]);
      }
      onTriggerConsumed?.();
    }
    lastTriggerRef.current = trigger || false;
  }, [trigger, config.enabled, config.maxConcurrent, fireworks.length, onTriggerConsumed]);
  
  // 动画更新
  useFrame((_, delta) => {
    if (!config.enabled) return;
    
    setFireworks(prev => {
      return prev
        .map(firework => {
          const newFirework = { ...firework };
          newFirework.life += delta;
          
          if (firework.phase === 'rising') {
            // 上升阶段
            newFirework.position = firework.position.clone().add(
              firework.velocity.clone().multiplyScalar(delta)
            );
            
            // 减速
            newFirework.velocity.y -= delta * 5;
            
            // 到达目标高度或速度为负时爆炸
            if (newFirework.position.y >= firework.targetY || newFirework.velocity.y <= 0) {
              newFirework.phase = 'exploding';
              newFirework.particles = createExplosionParticles(
                newFirework.position,
                firework.color
              );
              newFirework.life = 0;
            }
          } else if (firework.phase === 'exploding') {
            // 爆炸阶段 - 更新粒子
            newFirework.particles = firework.particles.map(particle => {
              const newParticle = { ...particle };
              
              // 更新位置
              newParticle.position = particle.position.clone().add(
                particle.velocity.clone().multiplyScalar(delta)
              );
              
              // 应用重力
              newParticle.velocity.y -= config.gravity * 10 * delta;
              
              // 空气阻力
              newParticle.velocity.multiplyScalar(0.98);
              
              // 减少生命值
              newParticle.life -= delta * config.fadeSpeed;
              
              return newParticle;
            });
            
            // 检查是否所有粒子都消失
            const allDead = newFirework.particles.every(p => p.life <= 0);
            if (allDead) {
              newFirework.phase = 'fading';
              newFirework.life = 0;
            }
          }
          
          return newFirework;
        })
        .filter(firework => {
          // 移除完全消失的烟花
          if (firework.phase === 'fading' && firework.life > 0.5) {
            return false;
          }
          return true;
        });
    });
  });

  // 清理资源：在组件卸载时清空烟花状态
  useEffect(() => {
    return () => {
      setFireworks([]);
    };
  }, []);

  if (!config.enabled) return null;

  return (
    <group ref={groupRef}>
      {fireworks.map(firework => (
        <group key={firework.id}>
          {/* 上升阶段的火花 */}
          {firework.phase === 'rising' && (
            <>
              <mesh position={firework.position}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshBasicMaterial 
                  color={firework.color}
                  transparent
                  opacity={0.9}
                />
              </mesh>
              {/* 上升拖尾 */}
              <mesh position={firework.position.clone().add(new THREE.Vector3(0, -1, 0))}>
                <sphereGeometry args={[0.15, 6, 6]} />
                <meshBasicMaterial 
                  color={firework.color}
                  transparent
                  opacity={0.5}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </>
          )}
          
          {/* 爆炸粒子 */}
          {firework.phase === 'exploding' && firework.particles.length > 0 && (
            <points>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={firework.particles.length}
                  array={new Float32Array(
                    firework.particles.flatMap(p => [p.position.x, p.position.y, p.position.z])
                  )}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="attributes-color"
                  count={firework.particles.length}
                  array={new Float32Array(
                    firework.particles.flatMap(p => [p.color.r, p.color.g, p.color.b])
                  )}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                size={2}
                vertexColors
                transparent
                opacity={Math.max(0, firework.particles[0]?.life || 0)}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </points>
          )}
        </group>
      ))}
    </group>
  );
};
