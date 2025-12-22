import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CONFIG, DEFAULT_BELL_CONFIG, DEFAULT_SHOOTING_STARS_CONFIG, DEFAULT_AURORA_CONFIG, DEFAULT_FIREWORKS_CONFIG } from '../config';
import { isMobile, isTablet } from '../utils/helpers';
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
  GiftBox
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
  heartBottomText?: string; // 爱心特效底部文字
  palmMove?: { x: number; y: number }; // 手掌滑动控制视角
  zoomDelta?: number; // 手势缩放控制
  onHeartPaused?: (paused: boolean) => void; // 爱心特效暂停状态回调
  fireworkTrigger?: boolean; // 烟花触发信号
  onFireworkTriggered?: () => void; // 烟花触发后回调
  // 礼物步骤
  showGiftBox?: boolean;
  giftBoxConfig?: {
    boxColor?: string;
    ribbonColor?: string;
  };
  isGiftWaiting?: boolean;
  isGiftOpen?: boolean;
  onGiftOpen?: () => void;
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
  heartPhotoInterval = 3000,
  heartBottomText,
  palmMove,
  zoomDelta,
  onHeartPaused,
  fireworkTrigger,
  onFireworkTriggered,
  showGiftBox = false,
  giftBoxConfig,
  isGiftWaiting = false,
  isGiftOpen = false,
  onGiftOpen
}: ExperienceProps) => {
  const controlsRef = useRef<any>(null);
  const mobile = isMobile();
  const prevSceneStateRef = useRef<SceneState>(sceneState);
  // 记录上一帧的相机角度，用于检测视角移动
  const lastAzimuthRef = useRef<number>(0);
  const lastPolarRef = useRef<number>(0);

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
    fog: config.fog || { enabled: true, opacity: 0.3, count: 800, size: 0.8, spread: 1, height: 1.5 }
  };

  useFrame((_, delta) => {
    if (controlsRef.current) {
      const isFormed = sceneState === 'FORMED';
      const isChaos = sceneState === 'CHAOS';
      
      // 检测视角是否移动，如果移动则取消选中照片
      const currentAzimuth = controlsRef.current.getAzimuthalAngle();
      const currentPolar = controlsRef.current.getPolarAngle();
      const azimuthDelta = Math.abs(currentAzimuth - lastAzimuthRef.current);
      const polarDelta = Math.abs(currentPolar - lastPolarRef.current);
      
      // 如果视角移动超过阈值，取消选中照片
      if (selectedPhotoIndex !== null && (azimuthDelta > 0.02 || polarDelta > 0.02)) {
        onPhotoSelect(null);
      }
      
      // 更新上一帧的角度
      lastAzimuthRef.current = currentAzimuth;
      lastPolarRef.current = currentPolar;
      
      // 状态切换时的视角处理
      if (prevSceneStateRef.current !== sceneState) {
        if (isFormed) {
          // 聚合时：平滑过渡到正对圣诞树的视角
          controlsRef.current.minPolarAngle = Math.PI / 4;
          controlsRef.current.maxPolarAngle = Math.PI / 1.8;
        } else {
          // 散开时：取消视角限制，可以自由旋转
          controlsRef.current.minPolarAngle = 0;
          controlsRef.current.maxPolarAngle = Math.PI;
        }
        prevSceneStateRef.current = sceneState;
      }
      
      // 聚合时平滑过渡到正对视角（没有选中照片时）
      if (isFormed && !palmMove && selectedPhotoIndex === null) {
        const targetPolar = Math.PI / 2.2; // 稍微俯视的角度
        const polarDiff = targetPolar - currentPolar;
        if (Math.abs(polarDiff) > 0.01) {
          controlsRef.current.setPolarAngle(currentPolar + polarDiff * delta * 2);
        }
      }
      
      // 手掌滑动控制视角
      if (palmMove && (Math.abs(palmMove.x) > 0.001 || Math.abs(palmMove.y) > 0.001)) {
        controlsRef.current.setAzimuthalAngle(currentAzimuth + palmMove.x);
        // 散开时不限制极角，聚合时限制
        if (isChaos) {
          const newPolar = Math.max(0.1, Math.min(Math.PI - 0.1, currentPolar + palmMove.y));
          controlsRef.current.setPolarAngle(newPolar);
        } else {
          const newPolar = Math.max(Math.PI / 4, Math.min(Math.PI / 1.8, currentPolar + palmMove.y));
          controlsRef.current.setPolarAngle(newPolar);
        }
      } else if (selectedPhotoIndex === null) {
        // 没有手掌控制且没有选中照片时使用自动旋转
        controlsRef.current.setAzimuthalAngle(currentAzimuth + rotationSpeed);
      }
      
      // 手势缩放控制
      // zoomDelta > 0 表示手张开 -> 放大（相机靠近，距离减小）
      // zoomDelta < 0 表示手收缩 -> 缩小（相机远离，距离增大）
      if (zoomDelta && Math.abs(zoomDelta) > 0.1) {
        const currentDistance = controlsRef.current.getDistance();
        // 反转方向：zoomDelta正值时距离减小（放大）
        const newDistance = Math.max(25, Math.min(100, currentDistance - zoomDelta * 1.5));
        // 通过调整相机位置实现缩放
        const direction = controlsRef.current.object.position.clone().normalize();
        controlsRef.current.object.position.copy(direction.multiplyScalar(newDistance));
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
        autoRotate={selectedPhotoIndex === null && rotationSpeed === 0 && sceneState === 'FORMED'}
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
      
      {/* 流星效果 */}
      {(config.shootingStars?.enabled ?? DEFAULT_SHOOTING_STARS_CONFIG.enabled) && (
        <ShootingStars
          config={{
            ...DEFAULT_SHOOTING_STARS_CONFIG,
            ...config.shootingStars,
            enabled: true
          }}
        />
      )}
      
      {/* 极光背景 */}
      {(config.aurora?.enabled ?? DEFAULT_AURORA_CONFIG.enabled) && (
        <Aurora
          config={{
            ...DEFAULT_AURORA_CONFIG,
            ...config.aurora,
            enabled: true
          }}
        />
      )}
      
      {/* 烟花效果 */}
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

      {/* 圣诞树主体 - 特效时隐藏 */}
      {!hideTree && (
        <group position={[0, -6, 0]}>
          {/* 底部雾气 - 放在最前面渲染，确保在树叶后面 */}
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
            {/* 3D 铃铛装饰 */}
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
            <TopStar state={sceneState} avatarUrl={config.topStar?.avatarUrl} treeHeight={config.treeShape?.height} />
          </Suspense>
          {safeConfig.sparkles.enabled && (
            <Sparkles count={safeConfig.sparkles.count} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
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
        photoScale={config.heartEffect?.photoScale || 1}
        frameColor={config.heartEffect?.frameColor || '#FFFFFF'}
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

      {/* 礼物步骤 - 3D 礼物盒 */}
      {showGiftBox && onGiftOpen && (
        <GiftBox
          boxColor={giftBoxConfig?.boxColor}
          ribbonColor={giftBoxConfig?.ribbonColor}
          isWaiting={isGiftWaiting}
          isOpen={isGiftOpen}
          onOpen={onGiftOpen}
        />
      )}

      {safeConfig.bloom.enabled && (
        <EffectComposer 
          multisampling={0}
          frameBufferType={isTablet() ? THREE.HalfFloatType : THREE.UnsignedByteType}
        >
          <Bloom 
            luminanceThreshold={isTablet() ? 0.95 : 0.9} 
            luminanceSmoothing={0.025} 
            intensity={isTablet() ? safeConfig.bloom.intensity * 0.8 : safeConfig.bloom.intensity} 
            radius={isTablet() ? 0.3 : 0.5}
            mipmapBlur={!isTablet()}
            levels={isTablet() ? 3 : 5}
          />
        </EffectComposer>
      )}
    </>
  );
};
