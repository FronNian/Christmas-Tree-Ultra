
import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../../config';
import type { SceneState, AnimationEasing, ScatterShape, GatherShape, DecorationColors, DecorationTypes, DecorationTwinkle, DecorationStyleConfig } from '../../types';
import { getGeometriesForStyle } from './DecorationGeometries';

// Added missing interface definition
interface ChristmasElementsProps {
  state: SceneState;
  customImages?: {
    box?: string;
    sphere?: string;
    cylinder?: string;
  };
  customColors?: DecorationColors;
  decorationTypes?: DecorationTypes;
  twinkle?: DecorationTwinkle;
  styleConfig?: DecorationStyleConfig;
  count?: number;
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  treeHeight?: number;
  treeRadius?: number;
}

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

const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const generateScatterPosition = (shape: ScatterShape, index: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 3 + 1);
  const r2 = seededRandom(index * 3 + 2);
  const r3 = seededRandom(index * 3 + 3);
  if (shape === 'explosion') {
    const theta = r1 * Math.PI * 2;
    const phi = Math.acos(2 * r2 - 1);
    const r = 20 + r3 * 25;
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  } else if (shape === 'spiral') {
    const t = r1;
    const angle = t * Math.PI * 12;
    const radius = 8 + t * 25 + r2 * 5;
    const y = -20 + t * 50 + (r3 - 0.5) * 8;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  } else if (shape === 'rain') {
    return new THREE.Vector3((r1 - 0.5) * 60, 25 + r2 * 35, (r3 - 0.5) * 60);
  } else if (shape === 'ring') {
    const angle = r1 * Math.PI * 2;
    const radius = 22 + r2 * 10;
    const y = (r3 - 0.5) * 15;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  } else {
    const theta = r1 * Math.PI * 2;
    const phi = Math.acos(2 * r2 - 1);
    const r = Math.cbrt(r3) * 30;
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
};

const generateTargetPosition = (index: number, h: number, rBase: number): THREE.Vector3 => {
  const r1 = seededRandom(index * 7 + 100);
  const r2 = seededRandom(index * 7 + 101);
  const y = (r1 * h) - (h / 2);
  const currentRadius = (rBase * (1 - (y + (h / 2)) / h)) * 0.95;
  const theta = r2 * Math.PI * 2;
  return new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
};

const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape, h: number, rBase: number): number => {
  const normalizedY = (targetPos.y + h / 2) / h;
  const normalizedX = (targetPos.x + rBase) / (2 * rBase);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / rBase;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  if (shape === 'stack') return normalizedY * 0.85;
  if (shape === 'spiralIn') {
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    const positionOnSpiral = (normalizedY * 5 + normalizedAngle) / 6;
    return Math.min(0.9, positionOnSpiral * 0.95);
  }
  if (shape === 'implode') return (1 - Math.min(1, dist)) * 0.8;
  if (shape === 'waterfall') return (1 - normalizedY) * 0.85;
  if (shape === 'wave') return normalizedX * 0.85;
  return 0;
};

const DEFAULT_COLORS: DecorationColors = { primary: '#D32F2F', secondary: '#FFD700', accent: '#1976D2', candy1: '#FF0000', candy2: '#FFFFFF' };
const DEFAULT_TYPES: DecorationTypes = { box: true, sphere: true, cylinder: true };
const DEFAULT_STYLE_CONFIG: DecorationStyleConfig = { style: 'classic', material: 'standard', transparency: 0, metalness: 0.4, roughness: 0.3, emissiveIntensity: 0.2 };

export const ChristmasElements = memo(({ 
  state, 
  customImages,
  customColors,
  decorationTypes,
  twinkle,
  styleConfig,
  count = CONFIG.counts.elements,
  easing = 'easeInOut', 
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct',
  treeHeight,
  treeRadius
}: ChristmasElementsProps) => {
  const twinkleEnabled = twinkle?.enabled ?? true;
  const twinkleSpeed = twinkle?.speed ?? 1;
  const twinkleFlashColor = twinkle?.flashColor ?? '#FFFFFF';
  const twinkleBaseColor = twinkle?.baseColor;
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;
  
  const finalStyleConfig = useMemo(() => ({ ...DEFAULT_STYLE_CONFIG, ...styleConfig }), [styleConfig]);
  const types = useMemo(() => ({ ...DEFAULT_TYPES, ...decorationTypes }), [decorationTypes]);
  const styleGeometries = useMemo(() => getGeometriesForStyle(finalStyleConfig.style), [finalStyleConfig.style]);
  const enabledTypes = useMemo(() => {
    const result: number[] = [];
    if (types.box) result.push(0);
    if (types.sphere) result.push(1);
    if (types.cylinder) result.push(2);
    return result.length === 0 ? [0] : result;
  }, [types]);
  
  const colors = useMemo(() => ({ ...DEFAULT_COLORS, ...customColors }), [customColors]);
  const decorationColors = useMemo(() => [colors.primary, colors.secondary, colors.accent], [colors]);
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const currentChaosRef = useRef<THREE.Vector3[]>([]);
  const targetChaosRef = useRef<THREE.Vector3[]>([]);
  const chaosTransitionRef = useRef(1);
  const prevScatterShapeRef = useRef(scatterShape);

  const textures = useMemo(() => {
    const result: { box?: THREE.Texture; sphere?: THREE.Texture; cylinder?: THREE.Texture } = {};
    const loader = new THREE.TextureLoader();
    if (customImages?.box) { result.box = loader.load(customImages.box); result.box.colorSpace = THREE.SRGBColorSpace; }
    if (customImages?.sphere) { result.sphere = loader.load(customImages.sphere); result.sphere.colorSpace = THREE.SRGBColorSpace; }
    if (customImages?.cylinder) { result.cylinder = loader.load(customImages.cylinder); result.cylinder.colorSpace = THREE.SRGBColorSpace; }
    return result;
  }, [customImages]);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const targetPos = generateTargetPosition(i, actualHeight, actualRadius);
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape, actualHeight, actualRadius);
      const r1 = seededRandom(i * 5 + 200);
      const r2 = seededRandom(i * 5 + 201);
      const r3 = seededRandom(i * 5 + 202);
      const r4 = seededRandom(i * 5 + 203);
      const r5 = seededRandom(i * 5 + 204);
      const r6 = seededRandom(i * 5 + 205);
      const r7 = seededRandom(i * 5 + 206);
      const type = enabledTypes[Math.floor(r1 * enabledTypes.length)];
      return {
        type, targetPos, gatherDelay, scale: type === 0 ? 0.8 + r3 * 0.4 : type === 1 ? 0.6 + r3 * 0.4 : 0.7 + r3 * 0.3,
        color: type === 2 ? (r2 > 0.5 ? colors.candy1 : colors.candy2) : decorationColors[Math.floor(r2 * decorationColors.length)],
        rotationSpeed: { x: (r3 - 0.5) * 2.0, y: (r4 - 0.5) * 2.0, z: (r5 - 0.5) * 2.0 },
        chaosRotation: new THREE.Euler(r3 * Math.PI, r4 * Math.PI, r5 * Math.PI),
        twinkleInterval: 1.5 + r6 * 2.5, twinklePhase: r7 * 10, twinkleIntensity: 0.8 + r6 * 0.4
      };
    });
  }, [count, gatherShape, decorationColors, colors, actualHeight, actualRadius, enabledTypes]);
  
  const timeRef = useRef(0);

  useEffect(() => {
    if (currentChaosRef.current.length !== count) {
      currentChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      targetChaosRef.current = currentChaosRef.current.map(p => p.clone());
      chaosTransitionRef.current = 1;
    }
  }, [count, data, scatterShape]);

  useEffect(() => {
    if (prevScatterShapeRef.current !== scatterShape) {
      currentChaosRef.current = currentChaosRef.current.map((pos, i) => {
        const newPos = pos.clone();
        if (chaosTransitionRef.current < 1) newPos.lerp(targetChaosRef.current[i], chaosTransitionRef.current);
        return newPos;
      });
      targetChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      chaosTransitionRef.current = 0;
      prevScatterShapeRef.current = scatterShape;
    }
  }, [scatterShape, data]);

  const duration = 1 / Math.max(0.3, Math.min(3, speed));
  const easeFn = easingFunctions[easing] || easingFunctions.easeInOut;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const time = timeRef.current;
    const targetProgress = state === 'FORMED' ? 1 : 0;
    const step = delta / duration;
    if (targetProgress > progressRef.current) progressRef.current = Math.min(targetProgress, progressRef.current + step);
    else if (targetProgress < progressRef.current) progressRef.current = Math.max(targetProgress, progressRef.current - step);
    const rawT = progressRef.current;
    if (chaosTransitionRef.current < 1) chaosTransitionRef.current = Math.min(1, chaosTransitionRef.current + step);
    
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      if (!objData) return;
      const animatedChaosPos = currentChaosRef.current[i].clone().lerp(targetChaosRef.current[i], easeFn(chaosTransitionRef.current));
      const delay = objData.gatherDelay;
      const elementT = delay === 0 ? easeFn(rawT) : easeFn(Math.max(0, Math.min(1, (rawT - delay) / (1 - delay))));
      child.position.lerpVectors(animatedChaosPos, objData.targetPos, elementT);
      
      let flashIntensity = 0;
      let isFlashingNow = false;
      if (twinkleEnabled) {
        const cycleTime = (time + objData.twinklePhase) % (objData.twinkleInterval / twinkleSpeed);
        isFlashingNow = cycleTime < 0.15;
        flashIntensity = isFlashingNow ? Math.pow(1 - cycleTime / 0.15, 0.3) * objData.twinkleIntensity * 2.5 : 0;
      }
      
      if (!(child instanceof THREE.Sprite)) {
        child.rotation.x += delta * objData.rotationSpeed.x * 0.5;
        child.rotation.y += delta * objData.rotationSpeed.y * 0.5;
        child.rotation.z += delta * objData.rotationSpeed.z * 0.5;
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.emissiveIntensity = finalStyleConfig.emissiveIntensity + flashIntensity * 1.5;
          const baseColor = twinkleBaseColor ? new THREE.Color(twinkleBaseColor) : new THREE.Color(objData.color);
          mat.emissive.copy(isFlashingNow ? baseColor.lerp(new THREE.Color(twinkleFlashColor), Math.min(1, 0.2 + flashIntensity * 0.4)) : baseColor);
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        const initialPos = currentChaosRef.current[i] ? currentChaosRef.current[i].clone() : new THREE.Vector3();
        if (finalStyleConfig.style === 'classic' && ((obj.type === 0 && textures.box) || (obj.type === 1 && textures.sphere) || (obj.type === 2 && textures.cylinder))) {
          const texture = obj.type === 0 ? textures.box : obj.type === 1 ? textures.sphere : textures.cylinder;
          return <sprite key={i} position={initialPos} scale={[obj.scale * 1.5, obj.scale * 1.5, 1]}><spriteMaterial map={texture} transparent depthWrite={false} opacity={0.95} /></sprite>;
        }
        const materialProps = { color: obj.color, roughness: finalStyleConfig.roughness, metalness: finalStyleConfig.metalness, emissive: obj.color, emissiveIntensity: finalStyleConfig.emissiveIntensity, transparent: finalStyleConfig.transparency > 0 || finalStyleConfig.material === 'glass', opacity: 1 - finalStyleConfig.transparency };
        return <mesh key={i} position={initialPos} scale={[obj.scale, obj.scale, obj.scale]} geometry={styleGeometries[obj.type]} rotation={obj.chaosRotation}>{finalStyleConfig.material === 'glass' ? <meshPhysicalMaterial {...materialProps} transmission={0.6} thickness={0.5} /> : <meshStandardMaterial {...materialProps} />}</mesh>;
      })}
    </group>
  );
});
