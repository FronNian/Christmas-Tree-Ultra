import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CONFIG } from '../config';
import { isMobile } from '../utils/helpers';
import type { SceneState, SceneConfig } from '../types';
import {
  Foliage,
  Snowfall,
  FairyLights,
  ChristmasElements,
  TopStar,
  GiftPile,
  FallingRibbons,
  GroundFog,
  SpiralRibbon,
  PhotoOrnaments
} from './three';
import { HeartParticles } from '../HeartParticles';
import { TextParticles } from '../TextParticles';

interface ExperienceProps {
  sceneState: SceneState;
  rotationSpeed: number;
  config: SceneConfig;
  selectedPhotoIndex: number | null;
  onPhotoSelect: (index: number | null) => void;
  photoPaths: string[];
  showHeart?: boolean;
  showText?: boolean;
  customMessage?: string;
  hideTree?: boolean;
  heartCount?: number;
  textCount?: number;
}

export const Experience = ({
  sceneState,
  rotationSpeed,
  config,
  selectedPhotoIndex,
  onPhotoSelect,
  photoPaths,
  showHeart,
  showText,
  customMessage,
  hideTree = false,
  heartCount = 1500
}: ExperienceProps) => {
  const controlsRef = useRef<any>(null);
  const isPhotoSelected = selectedPhotoIndex !== null;
  const mobile = isMobile();

  // Debug: 检查 topStar 配置
  console.log('[Experience] config.topStar:', config.topStar);

  // 确保 config 有新字段的默认值
  const safeConfig = {
    ...config,
    foliage: config.foliage || { enabled: true, count: 15000 },
    lights: config.lights || { enabled: true, count: 400 },
    elements: config.elements || { enabled: true, count: 500 },
    snow: config.snow || { enabled: true, count: 2000, speed: 2, size: 0.5, opacity: 0.8 },
    sparkles: config.sparkles || { enabled: true, count: 600 },
    stars: config.stars || { enabled: true },
    bloom: config.bloom || { enabled: true, intensity: 1.5 },
    title: config.title || { enabled: true, text: 'Merry Christmas', size: 48 },
    giftPile: config.giftPile || { enabled: true, count: 18 },
    ribbons: config.ribbons || { enabled: true, count: 50 },
    fog: config.fog || { enabled: true, opacity: 0.3 }
  };

  useFrame(() => {
    if (controlsRef.current && !isPhotoSelected) {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 50]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={!isPhotoSelected}
        enableRotate={!isPhotoSelected}
        enableDamping={true}
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        minDistance={25}
        maxDistance={100}
        autoRotate={!isPhotoSelected && rotationSpeed === 0 && sceneState === 'FORMED'}
        autoRotateSpeed={0.3}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />

      <color attach="background" args={['#000300']} />
      {safeConfig.stars.enabled && (
        <Stars radius={100} depth={50} count={mobile ? 2000 : 5000} factor={4} saturation={0} fade speed={1} />
      )}

      <ambientLight intensity={0.4} color="#003311" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />

      {safeConfig.snow.enabled && <Snowfall config={safeConfig.snow} />}
      {safeConfig.ribbons.enabled && <FallingRibbons count={safeConfig.ribbons.count} />}

      {/* 圣诞树主体 - 特效时隐藏 */}
      {!hideTree && (
        <group position={[0, -6, 0]}>
          {safeConfig.foliage.enabled && <Foliage state={sceneState} />}
          <Suspense fallback={null}>
            {photoPaths.length > 0 && (
              <PhotoOrnaments
                state={sceneState}
                selectedIndex={selectedPhotoIndex}
                onPhotoClick={onPhotoSelect}
                photoPaths={photoPaths}
              />
            )}
            {safeConfig.elements.enabled && (
              <ChristmasElements 
                state={sceneState} 
                customImages={config.elements?.customImages}
              />
            )}
            {safeConfig.lights.enabled && <FairyLights state={sceneState} />}
            {safeConfig.giftPile.enabled && <GiftPile state={sceneState} count={safeConfig.giftPile.count} />}
            <SpiralRibbon state={sceneState} color="#FF2222" glowColor="#FF4444" />
            <TopStar state={sceneState} avatarUrl={config.topStar?.avatarUrl} />
          </Suspense>
          {safeConfig.sparkles.enabled && (
            <Sparkles count={safeConfig.sparkles.count} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
          )}
          {safeConfig.fog.enabled && <GroundFog opacity={safeConfig.fog.opacity} />}
        </group>
      )}

      {/* 特效粒子 */}
      <HeartParticles visible={showHeart || false} color="#FF1493" count={mobile ? Math.min(heartCount, 1000) : heartCount} />
      <TextParticles text={customMessage || 'MERRY CHRISTMAS'} visible={showText || false} color="#FFD700" />

      {safeConfig.bloom.enabled && (
        <EffectComposer multisampling={0}>
          <Bloom 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.025} 
            intensity={safeConfig.bloom.intensity} 
            radius={0.5}
            mipmapBlur
            levels={5}
          />
        </EffectComposer>
      )}
    </>
  );
};
