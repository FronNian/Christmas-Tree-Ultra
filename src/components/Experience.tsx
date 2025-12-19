import { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CONFIG } from '../config';
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
  palmMove?: { x: number; y: number }; // 手掌滑动控制视角
  zoomDelta?: number; // 缩放增量（大拇指控制）
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
  palmMove,
  zoomDelta = 0
}: ExperienceProps) => {
  const controlsRef = useRef<any>(null);
  const isPhotoSelected = selectedPhotoIndex !== null;
  const mobile = isMobile();
  const prevSceneStateRef = useRef<SceneState>(sceneState);

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

  useFrame((state, delta) => {
    if (controlsRef.current && !isPhotoSelected) {
      const isFormed = sceneState === 'FORMED';
      const isChaos = sceneState === 'CHAOS';
      
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
      
      // 聚合时平滑过渡到正对视角
      if (isFormed && !palmMove) {
        const targetPolar = Math.PI / 2.2; // 稍微俯视的角度
        const currentPolar = controlsRef.current.getPolarAngle();
        const polarDiff = targetPolar - currentPolar;
        if (Math.abs(polarDiff) > 0.01) {
          controlsRef.current.setPolarAngle(currentPolar + polarDiff * delta * 2);
        }
      }
      
      // 手掌滑动控制视角
      if (palmMove && (Math.abs(palmMove.x) > 0.001 || Math.abs(palmMove.y) > 0.001)) {
        const currentAzimuth = controlsRef.current.getAzimuthalAngle();
        const currentPolar = controlsRef.current.getPolarAngle();
        controlsRef.current.setAzimuthalAngle(currentAzimuth + palmMove.x);
        // 散开时不限制极角，聚合时限制
        if (isChaos) {
          const newPolar = Math.max(0.1, Math.min(Math.PI - 0.1, currentPolar + palmMove.y));
          controlsRef.current.setPolarAngle(newPolar);
        } else {
          const newPolar = Math.max(Math.PI / 4, Math.min(Math.PI / 1.8, currentPolar + palmMove.y));
          controlsRef.current.setPolarAngle(newPolar);
        }
      } else {
        // 没有手掌控制时使用自动旋转
        controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      }
      
      // 大拇指缩放控制
      if (zoomDelta !== 0) {
        const camera = state.camera;
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        // 限制缩放范围
        const currentDist = camera.position.length();
        const newDist = currentDist + zoomDelta;
        if (newDist >= 25 && newDist <= 100) {
          camera.position.addScaledVector(direction, -zoomDelta);
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
            <TopStar state={sceneState} avatarUrl={config.topStar?.avatarUrl} treeHeight={config.treeShape?.height} />
          </Suspense>
          {safeConfig.sparkles.enabled && (
            <Sparkles count={safeConfig.sparkles.count} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
          )}
          {safeConfig.fog.enabled && (
            <GroundFog 
              opacity={safeConfig.fog.opacity} 
              color={config.fog?.color}
              treeHeight={config.treeShape?.height}
              treeRadius={config.treeShape?.radius}
            />
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
      />
      <TextParticles 
        text={customMessage || 'MERRY CHRISTMAS'} 
        visible={showText || false} 
        color={config.textEffect?.color || "#FFD700"}
        size={config.textEffect?.size}
      />

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
