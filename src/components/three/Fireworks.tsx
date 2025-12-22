import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FireworksConfig } from '../../types';

// 内部计算用的粒子
interface InternalParticle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

interface InternalFirework {
  id: number;
  phase: 'rising' | 'exploding' | 'done';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetY: number;
  color: THREE.Color;
  life: number;
  lastTrail: number;
  centerGlow: number;
  particles: InternalParticle[]; // 爆炸粒子
  trails: InternalParticle[]; // 尾翼粒子
}

// 渲染数据
interface ParticleRender {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  opacity: number;
  scale: number;
}

interface FireworkRender {
  id: number;
  phase: 'rising' | 'exploding';
  headX: number;
  headY: number;
  headZ: number;
  color: string;
  centerGlow: number;
  particles: ParticleRender[];
  trails: ParticleRender[];
}

interface FireworksProps {
  config: FireworksConfig;
  trigger?: boolean;
  onTriggerConsumed?: () => void;
}

export const Fireworks = ({ config, trigger, onTriggerConsumed }: FireworksProps) => {
  const [renderData, setRenderData] = useState<FireworkRender[]>([]);
  const dataRef = useRef<InternalFirework[]>([]);
  const idRef = useRef(0);
  const lastTriggerRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  // 光点纹理
  const glowTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const getColor = () => {
    const c = configRef.current.colors;
    return new THREE.Color(c[Math.floor(Math.random() * c.length)]);
  };

  const createFirework = () => {
    const x = (Math.random() - 0.5) * 50;
    const z = (Math.random() - 0.5) * 25 - 20;
    dataRef.current.push({
      id: idRef.current++,
      phase: 'rising',
      pos: new THREE.Vector3(x, -30, z),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        28 + Math.random() * 12,
        (Math.random() - 0.5) * 2
      ),
      targetY: 20 + Math.random() * 30,
      color: getColor(),
      life: 0,
      lastTrail: 0,
      centerGlow: 0,
      particles: [],
      trails: []
    });
  };

  const createExplosionParticles = (pos: THREE.Vector3, color: THREE.Color): InternalParticle[] => {
    const cfg = configRef.current;
    const count = Math.min(cfg.particleCount, 80);
    const speed = cfg.explosionSize * 1.2;
    const particles: InternalParticle[] = [];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );

      const c = color.clone();
      if (Math.random() > 0.4) {
        const hsl = { h: 0, s: 0, l: 0 };
        color.getHSL(hsl);
        c.setHSL((hsl.h + (Math.random() - 0.5) * 0.15 + 1) % 1, hsl.s, hsl.l + Math.random() * 0.25);
      }

      const spd = speed * (0.4 + Math.random() * 0.8);
      const maxLife = 1.5 + Math.random() * 0.8;

      particles.push({
        pos: pos.clone(),
        vel: dir.multiplyScalar(spd),
        color: c,
        life: maxLife,
        maxLife
      });
    }
    return particles;
  };

  // 触发
  useEffect(() => {
    if (trigger && !lastTriggerRef.current && config.enabled) {
      if (dataRef.current.filter(f => f.phase !== 'done').length < config.maxConcurrent) {
        createFirework();
      }
      onTriggerConsumed?.();
    }
    lastTriggerRef.current = trigger || false;
  }, [trigger, config.enabled, config.maxConcurrent, onTriggerConsumed]);

  // 自动发射
  useEffect(() => {
    if (!config.enabled) return;
    createFirework();

    let tid: ReturnType<typeof setTimeout>;
    const next = () => {
      tid = setTimeout(() => {
        if (dataRef.current.filter(f => f.phase !== 'done').length < configRef.current.maxConcurrent) {
          createFirework();
        }
        next();
      }, 2000 + Math.random() * 2000);
    };
    next();
    return () => clearTimeout(tid);
  }, [config.enabled]);

  // 动画
  useFrame((state, delta) => {
    if (!configRef.current.enabled) return;
    const cfg = configRef.current;
    const time = state.clock.elapsedTime;

    // 更新数据
    dataRef.current = dataRef.current.filter(fw => {
      fw.life += delta;

      if (fw.phase === 'rising') {
        fw.pos.add(fw.vel.clone().multiplyScalar(delta));
        fw.vel.y -= delta * 15;

        // 生成尾翼粒子
        if (time - fw.lastTrail > 0.02) {
          fw.lastTrail = time;
          const count = 3 + Math.floor(Math.random() * 3);
          for (let i = 0; i < count; i++) {
            fw.trails.push({
              pos: fw.pos.clone().add(
                new THREE.Vector3(
                  (Math.random() - 0.5) * 0.5,
                  -Math.random() * 0.3,
                  (Math.random() - 0.5) * 0.5
                )
              ),
              vel: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                -5 - Math.random() * 6,
                (Math.random() - 0.5) * 2
              ),
              color: fw.color.clone(),
              life: 0.4 + Math.random() * 0.3,
              maxLife: 0.5
            });
          }
        }

        // 更新尾翼
        fw.trails = fw.trails.filter(t => {
          t.pos.add(t.vel.clone().multiplyScalar(delta));
          t.vel.multiplyScalar(0.92);
          t.life -= delta * 2.5;
          return t.life > 0;
        });

        // 爆炸
        if (fw.pos.y >= fw.targetY || fw.vel.y <= 0) {
          fw.phase = 'exploding';
          fw.particles = createExplosionParticles(fw.pos, fw.color);
          fw.trails = [];
          fw.life = 0;
          fw.centerGlow = 1;
        }
      } else if (fw.phase === 'exploding') {
        fw.centerGlow *= 0.88;

        fw.particles = fw.particles.filter(p => {
          p.pos.add(p.vel.clone().multiplyScalar(delta));
          p.vel.multiplyScalar(0.96);
          p.vel.y -= cfg.gravity * 0.3 * delta;
          p.life -= delta * cfg.fadeSpeed * 0.4;
          return p.life > 0;
        });

        if (fw.particles.length === 0) {
          fw.phase = 'done';
          fw.life = 0;
        }
      }

      return fw.phase !== 'done' || fw.life < 0.1;
    });

    // 转换为渲染数据
    const newRenderData: FireworkRender[] = dataRef.current
      .filter(fw => fw.phase !== 'done')
      .map(fw => {
        const colorHex = `#${fw.color.getHexString()}`;

        // 爆炸粒子
        const particles: ParticleRender[] = fw.particles.map(p => ({
          x: p.pos.x,
          y: p.pos.y,
          z: p.pos.z,
          r: p.color.r,
          g: p.color.g,
          b: p.color.b,
          opacity: Math.min(1, p.life / p.maxLife),
          scale: 0.3 + (p.life / p.maxLife) * 0.4
        }));

        // 尾翼粒子
        const trails: ParticleRender[] = fw.trails.map(t => ({
          x: t.pos.x,
          y: t.pos.y,
          z: t.pos.z,
          r: t.color.r,
          g: t.color.g,
          b: t.color.b,
          opacity: Math.min(1, t.life / t.maxLife),
          scale: 0.3 + t.life * 0.5
        }));

        return {
          id: fw.id,
          phase: fw.phase as 'rising' | 'exploding',
          headX: fw.pos.x,
          headY: fw.pos.y,
          headZ: fw.pos.z,
          color: colorHex,
          centerGlow: fw.centerGlow,
          particles,
          trails
        };
      });

    setRenderData(newRenderData);
  });

  // 清理
  useEffect(
    () => () => {
      dataRef.current = [];
      glowTexture.dispose();
    },
    [glowTexture]
  );

  if (!config.enabled) return null;

  return (
    <group>
      {renderData.map(fw => (
        <group key={fw.id}>
          {/* 上升阶段 */}
          {fw.phase === 'rising' && (
            <>
              {/* 火花头部 */}
              <sprite position={[fw.headX, fw.headY, fw.headZ]} scale={[1.5, 1.5, 1]}>
                <spriteMaterial
                  map={glowTexture}
                  color={fw.color}
                  transparent
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </sprite>
              {/* 尾翼粒子 */}
              {fw.trails.map((t, i) => (
                <sprite key={i} position={[t.x, t.y, t.z]} scale={[t.scale, t.scale, 1]}>
                  <spriteMaterial
                    map={glowTexture}
                    color={new THREE.Color(t.r, t.g, t.b)}
                    transparent
                    opacity={t.opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </sprite>
              ))}
            </>
          )}

          {/* 爆炸阶段 */}
          {fw.phase === 'exploding' && (
            <>
              {/* 中心光晕 */}
              {fw.centerGlow > 0.05 && (
                <sprite
                  position={[fw.headX, fw.headY, fw.headZ]}
                  scale={[5 * fw.centerGlow, 5 * fw.centerGlow, 1]}
                >
                  <spriteMaterial
                    map={glowTexture}
                    color={fw.color}
                    transparent
                    opacity={fw.centerGlow}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </sprite>
              )}

              {/* 爆炸粒子 */}
              {fw.particles.map((p, i) => (
                <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.scale, p.scale, 1]}>
                  <spriteMaterial
                    map={glowTexture}
                    color={new THREE.Color(p.r, p.g, p.b)}
                    transparent
                    opacity={p.opacity}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </sprite>
              ))}
            </>
          )}
        </group>
      ))}
    </group>
  );
};
