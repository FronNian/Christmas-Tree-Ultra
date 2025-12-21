import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { CONFIG } from '../../config';
import type { SceneState } from '../../types';

interface TopStarProps {
  state: SceneState;
  avatarUrl?: string;
  treeHeight?: number;
}

export const TopStar = ({ state, avatarUrl, treeHeight }: TopStarProps) => {
  const actualHeight = treeHeight ?? CONFIG.tree.height;
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const [avatarTexture, setAvatarTexture] = useState<THREE.Texture | null>(null);

  const outerRadius = 1.3;
  const innerRadius = 0.7;

  // 加载头像纹理
  useEffect(() => {
    if (!avatarUrl) {
      setAvatarTexture(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(avatarUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      setAvatarTexture(texture);
    });
  }, [avatarUrl]);

  // 创建五角星形状
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) {
        shape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
      } else {
        shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
    }
    shape.closePath();
    return shape;
  }, [outerRadius, innerRadius]);

  // 创建挤出几何体（金色边框）
  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
  }, [starShape]);

  // 创建平面五角星几何体（用于贴图）- 稍微放大以覆盖 bevel
  const starFaceGeometry = useMemo(() => {
    // 创建稍大的星星形状来覆盖 bevel 边缘
    const scale = 1.15; // 放大 15% 覆盖 bevel
    const largerShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const radius = (i % 2 === 0 ? outerRadius : innerRadius) * scale;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) {
        largerShape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
      } else {
        largerShape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
    }
    largerShape.closePath();
    
    const geometry = new THREE.ShapeGeometry(largerShape);
    // 重新计算 UV
    const pos = geometry.attributes.position;
    const uvs: number[] = [];
    const maxR = outerRadius * scale;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uvs.push((x / maxR + 1) / 2);
      uvs.push((y / maxR + 1) / 2);
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return geometry;
  }, [outerRadius, innerRadius]);

  // 清理资源：在组件卸载时释放 geometry 和 texture
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      starFaceGeometry.dispose();
      if (avatarTexture) {
        avatarTexture.dispose();
      }
    };
  }, [starGeometry, starFaceGeometry, avatarTexture]);

  useFrame((frameState, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      const targetScale = state === 'FORMED' ? 1 : 0.01;
      const currentScale = groupRef.current.scale.x;
      const newScale = MathUtils.lerp(currentScale, targetScale, delta * 1.5);
      groupRef.current.scale.setScalar(Math.max(0.01, newScale));
    }

    const time = frameState.clock.elapsedTime;
    const pulse = 0.6 + Math.sin(time * 2) * 0.4;

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 1.5 + pulse;
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 80 + pulse * 40;
    }
  });

  const hasAvatar = !!avatarTexture;

  return (
    <group ref={groupRef} position={[0, actualHeight / 2 + 1.8, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        {/* 金色立体星星（始终显示作为边框） */}
        <mesh geometry={starGeometry}>
          <meshStandardMaterial
            ref={materialRef}
            color={CONFIG.colors.gold}
            emissive={CONFIG.colors.gold}
            emissiveIntensity={hasAvatar ? 1 : 2}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* 头像贴图（正面和背面，紧贴星星表面） */}
        {hasAvatar && avatarTexture && (
          <>
            {/* 正面 - 贴在 z=0.51 (depth 0.4 + bevel 0.1 + 微小偏移) */}
            <mesh geometry={starFaceGeometry} position={[0, 0, 0.51]}>
              <meshBasicMaterial map={avatarTexture} side={THREE.FrontSide} />
            </mesh>
            {/* 背面 - 贴在 z=-0.11 (bevel -0.1 - 微小偏移)，翻转显示 */}
            <mesh geometry={starFaceGeometry} position={[0, 0, -0.11]} rotation={[0, Math.PI, 0]}>
              <meshBasicMaterial map={avatarTexture} side={THREE.FrontSide} />
            </mesh>
          </>
        )}

        <pointLight
          ref={pointLightRef}
          color="#FFD700"
          intensity={100}
          distance={20}
          decay={2}
        />
      </Float>
    </group>
  );
};
