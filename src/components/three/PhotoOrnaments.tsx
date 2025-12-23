
import { useRef, useMemo, useEffect, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { CONFIG } from '../../config';
import { isMobile } from '../../utils/helpers';
import type { SceneState, PhotoScreenPosition, AnimationEasing, ScatterShape, GatherShape } from '../../types';

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
    const r = 25 + r3 * 30;
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
  } else if (shape === 'spiral') {
    const t = r1;
    const angle = t * Math.PI * 10;
    const radius = 10 + t * 30 + r2 * 6;
    const y = -25 + t * 60 + (r3 - 0.5) * 10;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  } else if (shape === 'rain') {
    return new THREE.Vector3((r1 - 0.5) * 70, 30 + r2 * 40, (r3 - 0.5) * 70);
  } else if (shape === 'ring') {
    const angle = r1 * Math.PI * 2;
    const radius = 25 + r2 * 12;
    const y = (r3 - 0.5) * 18;
    return new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle));
  } else {
    const theta = r1 * Math.PI * 2;
    const phi = Math.acos(2 * r2 - 1);
    const r = Math.cbrt(r3) * 35;
    return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
};

const generateTargetPosition = (index: number, total: number, h: number, rBase: number): THREE.Vector3 => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const heightRatio = (index + 0.5) / total;
  const y = (heightRatio * h * 0.9) - (h / 2) + (h * 0.05);
  const normalizedY = (y + h / 2) / h;
  const currentRadius = rBase * (1 - normalizedY * 0.85) + 0.8;
  const baseAngle = index * goldenAngle;
  const theta = baseAngle + (seededRandom(index * 7 + 300) * 0.3 - 0.15);
  const radiusOffset = (seededRandom(index * 7 + 301) - 0.5) * 0.8;
  const finalRadius = Math.max(0.5, currentRadius + radiusOffset);
  const yOffset = (seededRandom(index * 7 + 302) - 0.5) * 1.5;
  const finalY = Math.max(-h / 2 + 0.5, Math.min(h / 2 - 0.5, y + yOffset));
  return new THREE.Vector3(finalRadius * Math.cos(theta), finalY, finalRadius * Math.sin(theta));
};

const calculateGatherDelay = (targetPos: THREE.Vector3, shape: GatherShape, h: number, rBase: number): number => {
  const normalizedY = (targetPos.y + h / 2) / h;
  const normalizedX = (targetPos.x + rBase) / (2 * rBase);
  const dist = Math.sqrt(targetPos.x * targetPos.x + targetPos.z * targetPos.z) / rBase;
  const angle = Math.atan2(targetPos.z, targetPos.x);
  
  if (shape === 'stack') return normalizedY * 0.85;
  if (shape === 'spiralIn') {
    const spiralTurns = 5;
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
    const positionOnSpiral = (normalizedY * spiralTurns + normalizedAngle) / (spiralTurns + 1);
    return Math.min(0.9, positionOnSpiral * 0.95);
  }
  if (shape === 'implode') return (1 - Math.min(1, dist)) * 0.8;
  if (shape === 'waterfall') return (1 - normalizedY) * 0.85;
  if (shape === 'wave') return normalizedX * 0.85;
  return 0;
};

interface PhotoOrnamentsProps {
  state: SceneState;
  selectedIndex: number | null;
  onPhotoClick?: (index: number | null) => void;
  photoPaths: string[];
  easing?: AnimationEasing;
  speed?: number;
  scatterShape?: ScatterShape;
  gatherShape?: GatherShape;
  photoScale?: number;
  frameColor?: string;
  treeHeight?: number;
  treeRadius?: number;
  onScreenPositionsUpdate?: (positions: PhotoScreenPosition[]) => void;
}

export const PhotoOrnaments = memo(({ 
  state, 
  selectedIndex, 
  onPhotoClick, 
  photoPaths,
  easing = 'easeInOut',
  speed = 1,
  scatterShape = 'sphere',
  gatherShape = 'direct',
  photoScale = 1.5,
  frameColor = '#FFFFFF',
  treeHeight,
  treeRadius,
  onScreenPositionsUpdate
}: PhotoOrnamentsProps) => {
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const actualRadius = treeRadius ?? CONFIG.tree.radius;
  const textures = useTexture(photoPaths);
  const count = photoPaths.length;
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const currentChaosRef = useRef<THREE.Vector3[]>([]);
  const targetChaosRef = useRef<THREE.Vector3[]>([]);
  const chaosTransitionRef = useRef(1);
  const prevScatterShapeRef = useRef(scatterShape);
  const screenPositionsRef = useRef<PhotoScreenPosition[]>([]);
  const screenUpdateScheduledRef = useRef<number | null>(null);
  const screenUpdateCbRef = useRef<typeof onScreenPositionsUpdate>(onScreenPositionsUpdate);
  screenUpdateCbRef.current = onScreenPositionsUpdate;

  const textureData = useMemo(() => {
    return textures.map((texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      const image = texture.image as { width: number; height: number } | undefined;
      const aspectRatio = (image && image.width && image.height) ? image.width / image.height : 1;
      return { texture, aspectRatio };
    });
  }, [textures]);

  const baseSize = 1 * photoScale;
  const innerBorder = 0.03 * photoScale;
  const outerBorder = 0.08 * photoScale;
  
  const geometries = useMemo(() => {
    return textureData.map(({ aspectRatio }) => {
      const photoWidth = aspectRatio >= 1 ? baseSize * Math.sqrt(aspectRatio) : baseSize * Math.sqrt(aspectRatio);
      const photoHeight = aspectRatio >= 1 ? baseSize / Math.sqrt(aspectRatio) : baseSize / Math.sqrt(aspectRatio);
      const innerWidth = photoWidth + innerBorder * 2;
      const innerHeight = photoHeight + innerBorder * 2;
      const frameWidth = innerWidth + outerBorder * 2;
      const frameHeight = innerHeight + outerBorder * 2;
      return {
        photo: new THREE.PlaneGeometry(photoWidth, photoHeight),
        inner: new THREE.PlaneGeometry(innerWidth, innerHeight),
        frame: new THREE.PlaneGeometry(frameWidth, frameHeight)
      };
    });
  }, [textureData, baseSize, innerBorder, outerBorder]);
  
  const innerColor = useMemo(() => {
    const color = new THREE.Color(frameColor);
    color.multiplyScalar(0.7);
    return '#' + color.getHexString();
  }, [frameColor]);

  const data = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const targetPos = generateTargetPosition(i, count, actualHeight, actualRadius);
      const gatherDelay = calculateGatherDelay(targetPos, gatherShape, actualHeight, actualRadius);
      const r1 = seededRandom(i * 6 + 200);
      const r2 = seededRandom(i * 6 + 201);
      const r3 = seededRandom(i * 6 + 202);
      const r4 = seededRandom(i * 6 + 203);
      const r5 = seededRandom(i * 6 + 204);
      const r6 = seededRandom(i * 6 + 205);
      return {
        targetPos,
        scale: r1 < 0.2 ? 2.2 : 0.8 + r2 * 0.6,
        textureIndex: i % textures.length,
        gatherDelay,
        currentPos: new THREE.Vector3(),
        currentScale: 1,
        chaosRotation: new THREE.Euler(r3 * Math.PI, r4 * Math.PI, r5 * Math.PI),
        rotationSpeed: { x: (r3 - 0.5), y: (r4 - 0.5), z: (r5 - 0.5) },
        wobbleOffset: r5 * 10,
        wobbleSpeed: 0.5 + r6 * 0.5
      };
    });
  }, [textures, count, gatherShape, actualHeight, actualRadius]);

  useEffect(() => {
    if (currentChaosRef.current.length !== count) {
      currentChaosRef.current = data.map((_, i) => generateScatterPosition(scatterShape, i));
      targetChaosRef.current = currentChaosRef.current.map(p => p.clone());
      data.forEach((d, i) => d.currentPos.copy(currentChaosRef.current[i]));
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

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    const camera = stateObj.camera;
    const targetProgress = isFormed ? 1 : 0;
    const step = delta / duration;
    if (targetProgress > progressRef.current) progressRef.current = Math.min(targetProgress, progressRef.current + step);
    else if (targetProgress < progressRef.current) progressRef.current = Math.max(targetProgress, progressRef.current - step);
    const rawT = progressRef.current;
    if (chaosTransitionRef.current < 1) chaosTransitionRef.current = Math.min(1, chaosTransitionRef.current + step);

    groupRef.current.children.forEach((group, i) => {
      const objData = data[i];
      if (!objData) return;
      const isSelected = selectedIndex === i;
      const currentChaos = currentChaosRef.current[i];
      const targetChaos = targetChaosRef.current[i];
      if (!currentChaos || !targetChaos) return;
      const chaosT = easeFn(chaosTransitionRef.current);
      const animatedChaosPos = currentChaos.clone().lerp(targetChaos, chaosT);

      let targetScale: number;
      if (isSelected) {
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const mobile = isMobile();
        const distance = mobile ? 20 : 28;
        const target = camera.position.clone().add(cameraDir.multiplyScalar(distance));
        target.y += mobile ? 4 : 6;
        targetScale = mobile ? 6 : 8;
        objData.currentPos.lerp(target, delta * 8);
        group.position.copy(objData.currentPos);
      } else {
        const delay = objData.gatherDelay;
        const elementT = delay === 0 ? easeFn(rawT) : easeFn(Math.max(0, Math.min(1, (rawT - delay) / (1 - delay))));
        targetScale = objData.scale;
        group.position.lerpVectors(animatedChaosPos, objData.targetPos, elementT);
        objData.currentPos.copy(group.position);
      }

      if (!isSelected) {
        const screenPos = objData.currentPos.clone().project(camera);
        const screenX = (1 - screenPos.x) / 2;
        const screenY = (1 - screenPos.y) / 2;
        if (screenPos.z < 1 && screenX >= 0 && screenX <= 1 && screenY >= 0 && screenY <= 1) {
          screenPositionsRef.current[i] = { index: i, x: screenX, y: screenY };
        }
      }

      objData.currentScale = MathUtils.lerp(objData.currentScale, targetScale, delta * 3);
      group.scale.setScalar(objData.currentScale);

      if (isSelected) {
        group.lookAt(camera.position);
        group.rotation.y += Math.sin(time * 2) * 0.03;
      } else if (isFormed) {
        group.lookAt(new THREE.Vector3(group.position.x * 2, group.position.y + 0.5, group.position.z * 2));
        group.rotation.x += Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.05;
        group.rotation.z += Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.05;
      } else {
        group.rotation.x += delta * objData.rotationSpeed.x;
        group.rotation.y += delta * objData.rotationSpeed.y;
        group.rotation.z += delta * objData.rotationSpeed.z;
      }
    });
    // 将最新的屏幕坐标推给上层（仅在提供回调时），并且在 rAF 回调中触发，避免渲染阶段 setState 警告
    if (screenUpdateCbRef.current && screenUpdateScheduledRef.current === null) {
      screenUpdateScheduledRef.current = requestAnimationFrame(() => {
        screenUpdateScheduledRef.current = null;
        // 拷贝一份，防止上层修改引用
        screenUpdateCbRef.current?.([...screenPositionsRef.current]);
      });
    }
  });

  useEffect(() => {
    return () => {
      if (screenUpdateScheduledRef.current !== null) {
        cancelAnimationFrame(screenUpdateScheduledRef.current);
      }
    };
  }, []);

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        const geo = geometries[obj.textureIndex];
        return (
          <group
            key={i}
            position={currentChaosRef.current[i] ? currentChaosRef.current[i].clone() : new THREE.Vector3()}
            scale={[obj.scale, obj.scale, obj.scale]}
            rotation={state === 'CHAOS' ? obj.chaosRotation : [0, 0, 0]}
            onClick={() => {
              const nextIndex = selectedIndex === i ? null : i;
              requestAnimationFrame(() => onPhotoClick?.(nextIndex));
            }}
          >
            <group position={[0, 0, 0.02]}>
              <mesh geometry={geo.frame} position={[0, 0, -0.02]}>
                <meshBasicMaterial color={frameColor} side={THREE.FrontSide} />
              </mesh>
              <mesh geometry={geo.inner} position={[0, 0, -0.01]}>
                <meshBasicMaterial color={innerColor} side={THREE.FrontSide} />
              </mesh>
              <mesh geometry={geo.photo}>
                <meshBasicMaterial map={textureData[obj.textureIndex].texture} side={THREE.FrontSide} toneMapped={false} />
              </mesh>
            </group>
            <group position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
              <mesh geometry={geo.frame} position={[0, 0, -0.02]}>
                <meshBasicMaterial color={frameColor} side={THREE.FrontSide} />
              </mesh>
              <mesh geometry={geo.inner} position={[0, 0, -0.01]}>
                <meshBasicMaterial color={innerColor} side={THREE.FrontSide} />
              </mesh>
              <mesh geometry={geo.photo}>
                <meshBasicMaterial map={textureData[obj.textureIndex].texture} side={THREE.FrontSide} toneMapped={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
});
