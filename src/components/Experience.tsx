
import { useRef, Suspense, useEffect, memo, useMemo as useReactMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Sparkles, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CONFIG, DEFAULT_BELL_CONFIG, DEFAULT_SHOOTING_STARS_CONFIG, DEFAULT_AURORA_CONFIG, DEFAULT_FIREWORKS_CONFIG } from '../config';
import { isMobile, getOptimalPostProcessingConfig } from '../utils/helpers';
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
  GlowingStreaks,
  PhotoOrnaments,
  BellOrnaments,
  ShootingStars,
  Aurora,
  Fireworks,
  GiftBox,
  MusicWaves
} from './three';
import { HeartParticles } from '../HeartParticles';
import { TextParticles } from '../TextParticles';

interface ExperienceProps {
  sceneState: SceneState;
  rotationSpeed: React.MutableRefObject<number>;
  config: SceneConfig;
  selectedPhotoIndex: number | null;
  onPhotoSelect: (index: number | null) => void;
  photoPaths: string[];
  onPhotoScreenPositions?: (positions: import('../types').PhotoScreenPosition[]) => void;
  showHeart?: boolean;
  showText?: boolean;
  customMessage?: string;
  hideTree?: boolean;
  heartCount?: number;
  textCount?: number;
  heartCenterPhoto?: string;
  heartCenterPhotos?: string[];
  heartPhotoInterval?: number;
  heartPhotoIntervalOverride?: number | null;
  heartBottomText?: string;
  palmMoveRef?: React.MutableRefObject<{ x: number; y: number } | null>;
  zoomRef?: React.MutableRefObject<number>;
  onHeartPaused?: (paused: boolean) => void;
  fireworkTrigger?: boolean;
  onFireworkTriggered?: () => void;
  showGiftBox?: boolean;
  giftBoxConfig?: {
    boxColor?: string;
    ribbonColor?: string;
  };
  isGiftWaiting?: boolean;
  isGiftOpen?: boolean;
  onGiftOpen?: () => void;
  onAssetsLoaded?: () => void;
  audioLevelRef?: React.MutableRefObject<number | undefined>;
  disableAutoRotate?: boolean;
}

// 使用 memo 封装，仅在关键 props 变化时重渲染
export const Experience = memo(({
  sceneState,
  rotationSpeed,
  config,
  selectedPhotoIndex,
  onPhotoSelect,
  photoPaths,
  onPhotoScreenPositions,
  showHeart,
  showText,
  customMessage,
  hideTree = false,
  heartCount = 1500,
  heartCenterPhoto,
  heartCenterPhotos,
  heartPhotoInterval = 3000,
  heartPhotoIntervalOverride = null,
  heartBottomText,
  palmMoveRef,
  zoomRef,
  onHeartPaused,
  fireworkTrigger,
  onFireworkTriggered,
  showGiftBox = false,
  giftBoxConfig,
  isGiftWaiting = false,
  isGiftOpen = false,
  onGiftOpen,
  onAssetsLoaded,
  audioLevelRef,
  disableAutoRotate = false
}: ExperienceProps) => {
  const controlsRef = useRef<any>(null);
  const { active, total } = useProgress();
  const assetsReadyRef = useRef(false);
  const mobile = isMobile();
  const prevSceneStateRef = useRef<SceneState>(sceneState);
  const lastAzimuthRef = useRef<number>(0);
  const lastPolarRef = useRef<number>(0);
  const shouldDeselectPhotoRef = useRef<boolean>(false);

  const notifyAssetsReady = useRef(() => {
    if (!assetsReadyRef.current) {
      assetsReadyRef.current = true;
      onAssetsLoaded?.();
    }
  }).current;

  useEffect(() => {
    if (!active) {
      notifyAssetsReady();
    }
  }, [active, total, notifyAssetsReady]);

  useEffect(() => {
    const timer = setTimeout(() => notifyAssetsReady(), 3000);
    return () => clearTimeout(timer);
  }, [notifyAssetsReady]);

  useEffect(() => {
    if (shouldDeselectPhotoRef.current && selectedPhotoIndex !== null) {
      shouldDeselectPhotoRef.current = false;
      const timer = setTimeout(() => {
        onPhotoSelect(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  });

  // 使用 useMemo 稳定配置对象，防止无关渲染触发子组件重计算
  const safeConfig = useReactMemo(() => ({
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
    fog: config.fog || { enabled: true, opacity: 0.3, count: 800, size: 0.8, spread: 1, height: 1.5 }
  }), [config]);

  // 爱心相框颜色：优先使用 heartEffect.frameColor，其次回退到照片相框颜色，最后默认白色
  const heartFrameColor = useReactMemo(
    () => config.heartEffect?.frameColor ?? config.photoOrnaments?.frameColor ?? '#FFFFFF',
    [config.heartEffect?.frameColor, config.photoOrnaments?.frameColor]
  );

  // 后期处理配置（只计算一次，避免每帧重新计算导致闪烁）
  const ppConfig = useReactMemo(() => getOptimalPostProcessingConfig(), []);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      const isFormed = sceneState === 'FORMED';
      const isChaos = sceneState === 'CHAOS';
      
      const currentAzimuth = controlsRef.current.getAzimuthalAngle();
      const currentPolar = controlsRef.current.getPolarAngle();
      const azimuthDelta = Math.abs(currentAzimuth - lastAzimuthRef.current);
      const polarDelta = Math.abs(currentPolar - lastPolarRef.current);
      
      if (selectedPhotoIndex !== null && (azimuthDelta > 0.02 || polarDelta > 0.02)) {
        if (!shouldDeselectPhotoRef.current) {
          shouldDeselectPhotoRef.current = true;
        }
      }
      
      lastAzimuthRef.current = currentAzimuth;
      lastPolarRef.current = currentPolar;
      
      if (prevSceneStateRef.current !== sceneState) {
        if (isFormed) {
          controlsRef.current.minPolarAngle = Math.PI / 4;
          controlsRef.current.maxPolarAngle = Math.PI / 1.8;
        } else {
          controlsRef.current.minPolarAngle = 0;
          controlsRef.current.maxPolarAngle = Math.PI;
        }
        prevSceneStateRef.current = sceneState;
      }
      
      const currentPalmMove = palmMoveRef?.current;
      
      if (isFormed && !currentPalmMove && selectedPhotoIndex === null) {
        const targetPolar = Math.PI / 2.2;
        const polarDiff = targetPolar - currentPolar;
        if (Math.abs(polarDiff) > 0.01) {
          controlsRef.current.setPolarAngle(currentPolar + polarDiff * delta * 2);
        }
      }
      
      if (currentPalmMove && (Math.abs(currentPalmMove.x) > 0.001 || Math.abs(currentPalmMove.y) > 0.001)) {
        const smoothFactor = 0.15;
        const targetAzimuth = currentAzimuth + currentPalmMove.x;
        const smoothAzimuth = currentAzimuth + (targetAzimuth - currentAzimuth) * smoothFactor;
        controlsRef.current.setAzimuthalAngle(smoothAzimuth);
        
        if (isChaos) {
          const targetPolar = Math.max(0.1, Math.min(Math.PI - 0.1, currentPolar + currentPalmMove.y));
          const smoothPolar = currentPolar + (targetPolar - currentPolar) * smoothFactor;
          controlsRef.current.setPolarAngle(smoothPolar);
        } else {
          const targetPolar = Math.max(Math.PI / 4, Math.min(Math.PI / 1.8, currentPolar + currentPalmMove.y));
          const smoothPolar = currentPolar + (targetPolar - currentPolar) * smoothFactor;
          controlsRef.current.setPolarAngle(smoothPolar);
        }
        
        if (palmMoveRef?.current) {
          palmMoveRef.current = null;
        }
      } else if (selectedPhotoIndex === null) {
        const currentRotationSpeed = rotationSpeed.current;
        if (currentRotationSpeed !== 0) {
          controlsRef.current.setAzimuthalAngle(currentAzimuth + currentRotationSpeed);
        }
      }
      
      const currentZoomDelta = zoomRef?.current || 0;
      
      if (Math.abs(currentZoomDelta) > 0.1) {
        const clampedZoom = Math.max(-30, Math.min(30, currentZoomDelta));
        const currentDistance = controlsRef.current.getDistance();
        const targetDistance = Math.max(
          25,
          Math.min(100, currentDistance - clampedZoom * 1.5)
        );
        
        const direction = controlsRef.current.object.position.clone().normalize();
        const newPos = direction.multiplyScalar(THREE.MathUtils.lerp(currentDistance, targetDistance, 0.1));
        controlsRef.current.object.position.copy(newPos);
        
        if (zoomRef) {
          zoomRef.current *= 0.9; 
          if (Math.abs(zoomRef.current) < 0.1) zoomRef.current = 0;
        }
      }
      
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 50]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.1}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        minDistance={25}
        maxDistance={100}
        autoRotate={!disableAutoRotate && selectedPhotoIndex === null && rotationSpeed.current === 0 && sceneState === 'FORMED'}
        autoRotateSpeed={0.3}
        minPolarAngle={sceneState === 'CHAOS' ? 0 : Math.PI / 4}
        maxPolarAngle={sceneState === 'CHAOS' ? Math.PI : Math.PI / 1.8}
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
      
      {(config.shootingStars?.enabled ?? DEFAULT_SHOOTING_STARS_CONFIG.enabled) && (
        <ShootingStars
          config={{
            ...DEFAULT_SHOOTING_STARS_CONFIG,
            ...config.shootingStars,
            enabled: true
          }}
        />
      )}
      
      {(config.aurora?.enabled ?? DEFAULT_AURORA_CONFIG.enabled) && (
        <Aurora
          config={{
            ...DEFAULT_AURORA_CONFIG,
            ...config.aurora,
            enabled: true
          }}
        />
      )}
      
      {(config.fireworks?.enabled ?? DEFAULT_FIREWORKS_CONFIG.enabled) && (
        <Fireworks
          config={{
            ...DEFAULT_FIREWORKS_CONFIG,
            ...config.fireworks,
            enabled: true
          }}
          trigger={fireworkTrigger}
          onTriggerConsumed={onFireworkTriggered}
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

      {!hideTree && (
        <group position={[0, -6, 0]}>
          {safeConfig.fog.enabled && (
            <GroundFog 
              opacity={safeConfig.fog.opacity} 
              color={config.fog?.color}
              treeHeight={config.treeShape?.height}
              treeRadius={config.treeShape?.radius}
              count={config.fog?.count}
              size={config.fog?.size}
              spread={config.fog?.spread}
              height={config.fog?.height}
            />
          )}
          {config.musicWaves?.enabled && (
            <MusicWaves
              config={config.musicWaves}
              state={sceneState}
              treeHeight={config.treeShape?.height}
              audioLevelRef={audioLevelRef}
            />
          )}
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
              treeHeight={config.treeShape?.height}
              treeRadius={config.treeShape?.radius}
            />
          )}
          <Suspense fallback={null}>
            {photoPaths.length > 0 && (
              <PhotoOrnaments
                state={sceneState}
                selectedIndex={selectedPhotoIndex}
                onPhotoClick={onPhotoSelect}
                photoPaths={photoPaths}
                onScreenPositionsUpdate={onPhotoScreenPositions}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
                photoScale={config.photoOrnaments?.scale || 1.5}
                frameColor={config.photoOrnaments?.frameColor || '#FFFFFF'}
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
              />
            )}
            {safeConfig.elements.enabled && (
              <ChristmasElements 
                state={sceneState} 
                customImages={config.elements?.customImages}
                customColors={config.elements?.colors}
                decorationTypes={config.elements?.types}
                twinkle={config.elements?.twinkle}
                styleConfig={config.elements?.styleConfig}
                count={safeConfig.elements.count}
                easing={config.animation?.easing}
                speed={config.animation?.speed}
                scatterShape={config.animation?.scatterShape}
                gatherShape={config.animation?.gatherShape}
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
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
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
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
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
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
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
              />
            )}
            {config.glowingStreaks?.enabled && (
              <GlowingStreaks
                state={sceneState}
                count={config.glowingStreaks.count || 5}
                color={config.glowingStreaks.color || "#FFD700"}
                speed={config.glowingStreaks.speed || 1}
                tailLength={config.glowingStreaks.tailLength || 1.2}
                lineWidth={config.glowingStreaks.lineWidth || 3}
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
              />
            )}
            {(config.bells?.enabled ?? DEFAULT_BELL_CONFIG.enabled) && (
              <BellOrnaments
                config={{
                  ...DEFAULT_BELL_CONFIG,
                  ...config.bells,
                  enabled: true
                }}
                state={sceneState}
                treeHeight={config.treeShape?.height}
                treeRadius={config.treeShape?.radius}
              />
            )}
            <TopStar 
              state={sceneState} 
              avatarUrl={config.topStar?.avatarUrl} 
              treeHeight={config.treeShape?.height}
              size={config.topStar?.size || 1.0}
            />
          </Suspense>
          {safeConfig.sparkles.enabled && (
            <Sparkles count={safeConfig.sparkles.count} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
          )}
        </group>
      )}

      <HeartParticles 
        visible={showHeart || false}
        color={config.heartEffect?.color || '#FF1493'}
        count={mobile ? Math.min(heartCount, 1000) : heartCount}
        size={config.heartEffect?.size}
        centerPhoto={heartCenterPhoto}
        centerPhotos={heartCenterPhotos}
        photoInterval={heartPhotoIntervalOverride ?? heartPhotoInterval}
        photoScale={config.heartEffect?.photoScale || 1}
        frameColor={heartFrameColor}
        glowTrail={{
          enabled: config.heartEffect?.glowTrail?.enabled ?? true,
          color: config.heartEffect?.glowTrail?.color || config.heartEffect?.color || '#FF1493',
          speed: config.heartEffect?.glowTrail?.speed || 3,
          count: config.heartEffect?.glowTrail?.count || 2,
          size: config.heartEffect?.glowTrail?.size || 1.5
        }}
        bottomText={heartBottomText || config.heartEffect?.bottomText}
        textColor={config.heartEffect?.bottomTextColor || '#FFD700'}
        textSize={config.heartEffect?.bottomTextSize || 1}
        onPausedChange={onHeartPaused}
      />
      <TextParticles 
        text={customMessage || 'MERRY CHRISTMAS'} 
        visible={showText || false} 
        color={config.textEffect?.color || "#FFD700"}
        size={config.textEffect?.size}
      />

      {showGiftBox && onGiftOpen && (
        <GiftBox
          boxColor={giftBoxConfig?.boxColor}
          ribbonColor={giftBoxConfig?.ribbonColor}
          isWaiting={isGiftWaiting}
          isOpen={isGiftOpen}
          onOpen={onGiftOpen}
        />
      )}

      {safeConfig.bloom.enabled && ppConfig.enabled && ppConfig.bloomEnabled && (
        <EffectComposer 
          multisampling={ppConfig.multisampling}
          frameBufferType={ppConfig.useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType}
        >
          <Bloom 
            luminanceThreshold={mobile ? 0.95 : 0.9} 
            luminanceSmoothing={0.025} 
            intensity={ppConfig.bloomIntensity * (safeConfig.bloom.intensity / 1.5)} 
            radius={mobile ? 0.3 : 0.5}
            mipmapBlur={ppConfig.mipmapBlur}
            levels={ppConfig.bloomLevels}
          />
        </EffectComposer>
      )}
    </>
  );
});
