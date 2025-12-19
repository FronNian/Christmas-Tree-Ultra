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
  heartCenterPhoto?: string; // 爱心特效中心显示的照片（单张）
  heartCenterPhotos?: string[]; // 爱心特效中心轮播的照片（多张）
  heartPhotoInterval?: number; // 照片轮播间隔（毫秒）
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
  heartCount = 1500,
  heartCenterPhoto,
  heartCenterPhotos,
  heartPhotoInterval = 3000
}: ExperienceProps) => {
  const controlsRef = useRef<any>(null);
  const isPhotoSelected = selectedPhotoIndex !== null;
  const mobile = isMobile();

  // 确保 config 有新字段的默认值
  const safeConfig = {
    ...config,
    foliage: config.foliage || { enabled: true, count: 15000, color: '#00FF88', size: 1, glow: 1 },
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

      <color attach="background" args={[config.background?.color || '#000300']} />
      {safeConfig.stars.enabled && (
        <Stars 
          radius={100} 
          depth={50} 
          count={safeConfig.stars.count || (mobile ? 2000 : 5000)} 
          factor={safeConfig.stars.brightness || 4} 
          saturation={0} 
          fade 
          speed={1} 
        />
      )}

      <ambientLight intensity={0.4} color="#003311" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />

      {safeConfig.snow.enabled && <Snowfall config={safeConfig.snow} />}
      {safeConfig.ribbons.enabled && (
        <FallingRibbons count={safeConfig.ribbons.count} colors={config.ribbons?.colors} />
      )}

      {/* 圣诞树主体 - 特效时隐藏 */}
      {!hideTree && (
        <group position={[0, -6, 0]}>
          {safeConfig.foliage.enabled && (
            <Foliage 
              state={sceneState} 
              count={safeConfig.foliage.count}
              color={safeConfig.foliage.color}
              chaosColor={safeConfig.foliage.chaosColor}
              size={safeConfig.foliage.size}
              glow={safeConfig.foliage.glow}
              easing={config.animation?.easing}
              speed={config.animation?.speed}
              scatterShape={config.animation?.scatterShape}
              gatherShape={config.animation?.gatherShape}
            />
          )}
          <Suspense fallback={null}>
            {photoPaths.length > 0 && (
              <PhotoOrnaments
                state={sceneState}
                selectedIndex={selectedPhotoIndex}
                onPhotoClick={onPhotoSelect}
                photoPaths={photoPaths}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
              />
            )}
            {safeConfig.elements.enabled && (
              <ChristmasElements 
                state={sceneState} 
                customImages={config.elements?.customImages}
                customColors={config.elements?.colors}
                count={safeConfig.elements.count}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
              />
            )}
            {safeConfig.lights.enabled && (
              <FairyLights 
                state={sceneState}
                count={safeConfig.lights.count}
                customColors={config.lights?.colors}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
              />
            )}
            {safeConfig.giftPile.enabled && (
              <GiftPile 
                state={sceneState} 
                count={safeConfig.giftPile.count}
                colors={config.giftPile?.colors}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
              />
            )}
            {(config.spiralRibbon?.enabled !== false) && (
              <SpiralRibbon 
                state={sceneState} 
                color={config.spiralRibbon?.color || "#FF2222"}
                glowColor={config.spiralRibbon?.glowColor || "#FF4444"}
                width={config.spiralRibbon?.width || 0.8}
                turns={config.spiralRibbon?.turns || 5}
                double={config.spiralRibbon?.double || false}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
              />
            )}
            <TopStar state={sceneState} avatarUrl={config.topStar?.avatarUrl} />
          </Suspense>
          {safeConfig.sparkles.enabled && (
            <Sparkles count={safeConfig.sparkles.count} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
          )}
          {safeConfig.fog.enabled && (
            <GroundFog opacity={safeConfig.fog.opacity} color={config.fog?.color} />
          )}
        </group>
      )}

      {/* 特效粒子 */}
      <HeartParticles 
        visible={showHeart || false} 
        color={config.heartEffect?.color || "#FF1493"} 
        count={mobile ? Math.min(heartCount, 1000) : heartCount}
        size={config.heartEffect?.size}
        centerPhoto={heartCenterPhoto}
        centerPhotos={heartCenterPhotos}
        photoInterval={heartPhotoInterval}
        glowTrail={{
          enabled: config.heartEffect?.glowTrail?.enabled ?? true,
          color: config.heartEffect?.glowTrail?.color || config.heartEffect?.color || '#FF1493',
          speed: config.heartEffect?.glowTrail?.speed || 3,
          count: config.heartEffect?.glowTrail?.count || 2,
          size: config.heartEffect?.glowTrail?.size || 1.5
        }}
      />
      <TextParticles 
        text={customMessage || 'MERRY CHRISTMAS'} 
        visible={showText || false} 
        color={config.textEffect?.color || "#FFD700"}
        size={config.textEffect?.size}
      />

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
