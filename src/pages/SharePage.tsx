import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience, GestureController, TitleOverlay, WelcomeTutorial, IntroOverlay } from '../components';
import { CHRISTMAS_MUSIC_URL } from '../config';
import { isMobile } from '../utils/helpers';
import { sanitizeShareConfig, sanitizePhotos, sanitizeText } from '../utils/sanitize';
import { getShare } from '../lib/r2';
import type { ShareData } from '../lib/r2';
import type { SceneState, SceneConfig } from '../types';
import { Volume2, VolumeX, TreePine, Sparkles, Loader, Frown, HelpCircle } from 'lucide-react';

// 深度合并配置对象
function deepMergeConfig<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        result[key] = deepMergeConfig(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  return result;
}

interface SharePageProps {
  shareId: string;
}

export default function SharePage({ shareId }: SharePageProps) {
  const mobile = isMobile();

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  // 场景状态
  const [sceneState, setSceneState] = useState<SceneState>('FORMED');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  // 手势效果状态
  const [showHeart, setShowHeart] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<string>('');
  // 教程状态 - 首次访问分享页显示
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return !localStorage.getItem('share_tutorial_seen');
    } catch {
      return true;
    }
  });
  const [hideTree, setHideTree] = useState(false);
  const [preloadTextPlayed, setPreloadTextPlayed] = useState(false);
  
  // 开场文案状态
  const [introShown, setIntroShown] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textSwitchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 从分享数据加载配置
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>({
    foliage: { enabled: true, count: mobile ? 5000 : 15000, color: '#00FF88', size: 1, glow: 1 },
    lights: { enabled: true, count: mobile ? 100 : 400 },
    elements: { enabled: true, count: mobile ? 150 : 500 },
    snow: { enabled: true, count: mobile ? 500 : 2000, speed: 2, size: 0.5, opacity: 0.8 },
    sparkles: { enabled: !mobile, count: mobile ? 0 : 600 },
    stars: { enabled: true },
    bloom: { enabled: true, intensity: 1.5 },
    title: { enabled: true, text: 'Merry Christmas', size: 48 },
    giftPile: { enabled: true, count: 18 },
    ribbons: { enabled: true, count: mobile ? 30 : 50 },
    fog: { enabled: true, opacity: 0.3 }
  });

  // 加载分享数据
  useEffect(() => {
    const loadShare = async () => {
      setLoading(true);
      const data = await getShare(shareId);
      
      if (!data) {
        setError('分享不存在或已过期');
        setLoading(false);
        return;
      }
      
      // 安全验证：清理配置和照片数据
      const sanitizedConfig = sanitizeShareConfig(data.config);
      const sanitizedPhotos = sanitizePhotos(data.photos);
      const sanitizedMessage = sanitizeText(data.message, 100);
      
      // 更新分享数据（使用清理后的数据）
      setShareData({
        ...data,
        config: sanitizedConfig,
        photos: sanitizedPhotos,
        message: sanitizedMessage
      });
      
      // 应用保存的配置（深度合并确保所有字段都有值）
      if (sanitizedConfig) {
        const cfg = sanitizedConfig as Partial<SceneConfig>;
        setSceneConfig(prev => deepMergeConfig(prev as unknown as Record<string, unknown>, cfg as unknown as Record<string, unknown>) as unknown as SceneConfig);
        
        // 如果配置了先显示文字，启动文字效果
        if (cfg.preloadText) {
          setHideTree(true);
          setShowText(true);
          setPreloadTextPlayed(true);
        }
      }
      
      setLoading(false);
    };
    
    loadShare();
  }, [shareId]);

  // 预加载文字效果的定时器
  useEffect(() => {
    if (!preloadTextPlayed || !shareData) return;
    
    const cfg = sceneConfig;
    const effectConfig = cfg.gestureEffect || { duration: 5000, hideTree: true };
    const texts = cfg.gestureTexts || [cfg.gestureText || shareData.message || 'MERRY CHRISTMAS'];
    const switchInterval = (cfg.textSwitchInterval || 3) * 1000;
    
    // 如果有多条文字，启动轮播
    if (texts.length > 1) {
      let idx = 0;
      textSwitchRef.current = setInterval(() => {
        idx = (idx + 1) % texts.length;
        setCurrentTextIndex(idx);
      }, switchInterval);
    }
    
    // 计算总时长
    const totalDuration = texts.length > 1 
      ? Math.max(effectConfig.duration, texts.length * switchInterval)
      : effectConfig.duration;
    
    // 效果结束后显示圣诞树
    const timer = setTimeout(() => {
      setShowText(false);
      setHideTree(false);
      if (textSwitchRef.current) clearInterval(textSwitchRef.current);
    }, totalDuration);
    
    return () => {
      clearTimeout(timer);
      if (textSwitchRef.current) clearInterval(textSwitchRef.current);
    };
  }, [preloadTextPlayed, shareData, sceneConfig]);

  // 默认手势配置
  const defaultGestures = {
    Closed_Fist: 'formed',
    Open_Palm: 'chaos',
    Pointing_Up: 'music',
    Thumb_Down: 'none',
    Thumb_Up: 'screenshot',
    Victory: 'text',
    ILoveYou: 'heart'
  };

  // 上一次触发的手势（防止重复触发）
  const lastGestureRef = useRef<string>('');
  const gestureActiveRef = useRef<boolean>(false);

  // 执行手势动作
  const executeGestureAction = useCallback((action: string) => {
    const effectConfig = sceneConfig.gestureEffect || { duration: 5000, hideTree: true };
    const texts = sceneConfig.gestureTexts || [sceneConfig.gestureText || shareData?.message || 'MERRY CHRISTMAS'];
    const switchInterval = (sceneConfig.textSwitchInterval || 3) * 1000;
    
    switch (action) {
      case 'formed':
        setSceneState('FORMED');
        break;
      case 'chaos':
        setSceneState('CHAOS');
        break;
      case 'heart':
        if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
        setShowHeart(true);
        setShowText(false);
        if (effectConfig.hideTree) setHideTree(true);
        heartTimeoutRef.current = setTimeout(() => {
          setShowHeart(false);
          if (effectConfig.hideTree) setHideTree(false);
          gestureActiveRef.current = false;
        }, effectConfig.duration);
        break;
      case 'text':
        if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
        if (textSwitchRef.current) clearInterval(textSwitchRef.current);
        
        setCurrentTextIndex(0);
        setShowText(true);
        setShowHeart(false);
        if (effectConfig.hideTree) setHideTree(true);
        
        if (texts.length > 1) {
          let idx = 0;
          textSwitchRef.current = setInterval(() => {
            idx = (idx + 1) % texts.length;
            setCurrentTextIndex(idx);
          }, switchInterval);
        }
        
        const totalDuration = texts.length > 1 
          ? Math.max(effectConfig.duration, texts.length * switchInterval)
          : effectConfig.duration;
        
        textTimeoutRef.current = setTimeout(() => {
          setShowText(false);
          if (effectConfig.hideTree) setHideTree(false);
          if (textSwitchRef.current) clearInterval(textSwitchRef.current);
          gestureActiveRef.current = false;
        }, totalDuration);
        break;
      case 'music':
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
            setMusicPlaying(true);
          } else {
            audioRef.current.pause();
            setMusicPlaying(false);
          }
        }
        break;
      case 'screenshot':
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const link = document.createElement('a');
          link.download = 'christmas-tree.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        break;
      case 'reset':
        setSceneState('FORMED');
        setRotationSpeed(0);
        break;
      default:
        break;
    }
  }, [sceneConfig, shareData]);

  // 处理手势变化
  const handleGestureChange = useCallback((gesture: string) => {
    setCurrentGesture(gesture);
    
    // 使用配置中的手势映射，如果没有则使用默认值
    const gestures = sceneConfig.gestures || defaultGestures;
    const action = gestures[gesture as keyof typeof gestures];
    
    // 如果是同一个手势且效果正在显示中，不重复触发
    if (gesture === lastGestureRef.current && gestureActiveRef.current) {
      return;
    }
    
    // 如果手势变了，重置状态
    if (gesture !== lastGestureRef.current) {
      gestureActiveRef.current = false;
    }
    
    if (action && action !== 'none') {
      lastGestureRef.current = gesture;
      gestureActiveRef.current = true;
      executeGestureAction(action);
    }
  }, [sceneConfig.gestures, executeGestureAction]);

  // 初始化音频 - 教程显示时不自动播放
  useEffect(() => {
    audioRef.current = new Audio(CHRISTMAS_MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    // 教程显示时不播放音乐
    if (!showTutorial) {
      const playAudio = () => {
        audioRef.current?.play().catch(() => setMusicPlaying(false));
      };
      playAudio();
    }

    const handleInteraction = () => {
      // 教程显示时不自动播放
      if (showTutorial) return;
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {});
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 教程关闭后开始播放音乐
  useEffect(() => {
    if (!showTutorial && audioRef.current && musicPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [showTutorial, musicPlaying]);

  // 播放/暂停音乐
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) return;
    if (musicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    setMusicPlaying(!musicPlaying);
  }, [musicPlaying]);

  // 加载中
  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFD700',
        fontSize: '24px',
        fontFamily: 'sans-serif',
        gap: '12px'
      }}>
        <Loader size={28} className="spin" /> 加载中...
      </div>
    );
  }

  // 错误
  if (error || !shareData) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFD700',
        fontSize: '20px',
        fontFamily: 'sans-serif',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Frown size={24} /> {error || '加载失败'}
        </div>
        <a href="/" style={{ color: '#FFD700', textDecoration: 'underline' }}>
          返回首页创建自己的圣诞树
        </a>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', backgroundColor: '#000', position: 'fixed', top: 0, left: 0, overflow: 'hidden', touchAction: 'none' }}>
      {/* 开场文案 */}
      {sceneConfig.intro?.enabled && !introShown && (
        <IntroOverlay
          text={sceneConfig.intro.text}
          subText={sceneConfig.intro.subText}
          duration={sceneConfig.intro.duration}
          onComplete={() => setIntroShown(true)}
        />
      )}

      {/* 3D Canvas - 教程显示时暂停渲染 */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas
          dpr={mobile ? 1 : [1, 2]}
          gl={{
            toneMapping: THREE.ReinhardToneMapping,
            antialias: !mobile,
            powerPreference: mobile ? 'low-power' : 'high-performance'
          }}
          shadows={false}
          frameloop={showTutorial ? 'never' : 'always'}
        >
          <Experience
            sceneState={sceneState}
            rotationSpeed={rotationSpeed}
            config={sceneConfig}
            selectedPhotoIndex={selectedPhotoIndex}
            onPhotoSelect={setSelectedPhotoIndex}
            photoPaths={shareData.photos}
            showHeart={showHeart}
            showText={showText}
            customMessage={(sceneConfig.gestureTexts || [sceneConfig.gestureText || shareData.message || 'MERRY CHRISTMAS'])[currentTextIndex] || 'MERRY CHRISTMAS'}
            hideTree={hideTree}
            heartCount={sceneConfig.gestureEffect?.heartCount || 1500}
            textCount={sceneConfig.gestureEffect?.textCount || 1000}
          />
        </Canvas>
      </div>

      {/* 手势控制器 - 教程显示时禁用 */}
      <GestureController
        onGesture={handleGestureChange}
        onMove={setRotationSpeed}
        onStatus={setAiStatus}
        debugMode={false}
        enabled={!showTutorial}
        isPhotoSelected={selectedPhotoIndex !== null}
      />

      {/* 底部按钮 - 分享模式只显示音乐、帮助和聚合/散开 */}
      <div style={{
        position: 'fixed',
        bottom: mobile ? 'max(20px, env(safe-area-inset-bottom))' : '30px',
        right: mobile ? '10px' : '40px',
        left: mobile ? '10px' : 'auto',
        zIndex: 100,
        display: 'flex',
        gap: mobile ? '8px' : '10px',
        justifyContent: mobile ? 'center' : 'flex-end',
        flexWrap: 'wrap',
        pointerEvents: 'auto'
      }}>
        <button onClick={toggleMusic} style={buttonStyle(musicPlaying, mobile)}>
          {musicPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <button onClick={() => setShowTutorial(true)} style={buttonStyle(false, mobile)} title="使用帮助">
          <HelpCircle size={18} />
        </button>

        <button
          onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')}
          style={{ ...buttonStyle(false, mobile), padding: mobile ? '12px 24px' : '12px 30px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sceneState === 'CHAOS' ? <><TreePine size={18} /> 聚合</> : <><Sparkles size={18} /> 散开</>}
        </button>
      </div>

      {/* AI 状态 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: aiStatus.includes('ERROR') || aiStatus.includes('DISABLED') ? '#888' : 'rgba(255, 215, 0, 0.4)',
        fontSize: '10px',
        letterSpacing: '2px',
        zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        {aiStatus} {currentGesture && `| ${currentGesture}`}
      </div>

      {/* 标题 */}
      <TitleOverlay 
        text={sceneConfig.title?.text || 'Merry Christmas'} 
        enabled={sceneConfig.title?.enabled ?? true} 
        size={sceneConfig.title?.size || 48}
        font={sceneConfig.title?.font || 'Mountains of Christmas'}
        color={sceneConfig.title?.color || '#FFD700'}
        shadowColor={sceneConfig.title?.shadowColor}
      />

      {/* 使用教程 */}
      {showTutorial && <WelcomeTutorial onClose={() => setShowTutorial(false)} isSharePage />}
    </div>
  );
}

// 按钮样式
const buttonStyle = (active: boolean, mobile: boolean): React.CSSProperties => ({
  padding: mobile ? '12px 16px' : '12px 15px',
  backgroundColor: active ? '#FFD700' : 'rgba(0,0,0,0.7)',
  border: '1px solid #FFD700',
  color: active ? '#000' : '#FFD700',
  fontFamily: 'sans-serif',
  fontSize: mobile ? '14px' : '12px',
  fontWeight: 'bold',
  cursor: 'pointer',
  borderRadius: '8px'
});
