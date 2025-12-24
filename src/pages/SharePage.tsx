import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience, GestureController, TitleOverlay, WelcomeTutorial, IntroOverlay, CenterPhoto, LyricsDisplay, GiftStepOverlay, VoicePlayer, LetterStepOverlay } from '../components';
import { CHRISTMAS_MUSIC_URL } from '../config';
import { THEME_PRESETS } from '../config/themes';
import { isMobile, isTablet, getDefaultSceneConfig, toggleFullscreen, isFullscreen, isFullscreenSupported, enterFullscreen, lockLandscape, getOptimalWebGLConfig } from '../utils/helpers';
import { sanitizeShareConfig, sanitizePhotos, sanitizeText } from '../utils/sanitize';
import { createAudioAnalyser, startAudioLevelUpdate, clearAudioCache } from '../utils/audioAnalysis';
import { getShare } from '../lib/r2';
import type { ShareData } from '../lib/r2';
import type { SceneState, SceneConfig, PhotoScreenPosition } from '../types';
import { PRESET_MUSIC } from '../types';
import { useTimeline } from '../hooks/useTimeline';
import { Volume2, VolumeX, TreePine, Sparkles, Loader, Frown, HelpCircle, Play, Maximize, Minimize, RotateCcw } from 'lucide-react';

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
  const [loadingStage, setLoadingStage] = useState<string>('正在连接服务器...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [assetsReady, setAssetsReady] = useState(false);
  const [musicReady, setMusicReady] = useState(false); // 音乐加载状态
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const assetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoScreenPositionsRef = useRef<PhotoScreenPosition[]>([]);

  // WebGL 兼容性配置（只计算一次）
  const glConfig = useMemo(() => {
    const optimalConfig = getOptimalWebGLConfig();
    return {
      toneMapping: THREE.ReinhardToneMapping,
      antialias: optimalConfig.antialias,
      powerPreference: optimalConfig.powerPreference,
      logarithmicDepthBuffer: optimalConfig.logarithmicDepthBuffer,
      precision: optimalConfig.precision,
      stencil: optimalConfig.stencil,
      depth: optimalConfig.depth,
      alpha: optimalConfig.alpha,
      preserveDrawingBuffer: optimalConfig.preserveDrawingBuffer,
      failIfMajorPerformanceCaveat: optimalConfig.failIfMajorPerformanceCaveat
    };
  }, []);

  // 场景状态
  const [sceneState, setSceneState] = useState<SceneState>('FORMED');
  // 性能优化：rotationSpeed 改为 Ref，避免每帧触发 React 重渲染导致卡顿
  const rotationSpeedRef = useRef(0);
  // 使用 ref 存储手掌移动值，避免频繁状态更新导致卡顿
  const palmMoveRef = useRef<{ x: number; y: number } | null>(null);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [photoLocked, setPhotoLocked] = useState(false); // 照片选中后的锁定期
  const [glResetKey, setGlResetKey] = useState(0);

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
  // 故事线「爱心特效」步骤下的照片间隔覆盖值（ms），非故事线模式为 null
  const [heartStepIntervalOverride, setHeartStepIntervalOverride] = useState<number | null>(null);
  const [preloadTextPlayed, setPreloadTextPlayed] = useState(false);
  // WebGL 上下文丢失时重建 Canvas（移动端/低端设备可能出现）
  const handleWebglContextLost = useCallback((e?: Event) => {
    try {
      e?.preventDefault?.();
    } catch {
      // ignore
    }
    console.warn('WebGL context lost on share page, restarting renderer...');
    setGlResetKey((k) => k + 1);
  }, []);
  
  // 开场文案状态
  const [introShown, setIntroShown] = useState(false);
  
  // 音乐提示状态 - 故事线模式需要用户先点击才能播放音乐
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [soundPromptDismissed, setSoundPromptDismissed] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioAnalyserRef = useRef<ReturnType<typeof createAudioAnalyser> | null>(null);
  const audioLevelUpdateStopRef = useRef<(() => void) | null>(null);
  const audioLevelRef = useRef<number | undefined>(0);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textSwitchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 配置 refs（避免 useCallback 依赖变化导致重新创建）
  const configuredTextsRef = useRef<string[]>([]);
  const textSwitchIntervalRef = useRef<number>(3000);
  const hideTreeConfigRef = useRef<boolean>(true);
  
  // 手势状态 refs
  const lastGestureRef = useRef<string>('');
  const gestureActiveRef = useRef<boolean>(false);

  // 从分享数据加载配置（移动端/平板使用最低配置）
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>(() => {
    return getDefaultSceneConfig() as unknown as SceneConfig;
  });
  
  // 全屏状态
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  
  // 全屏横屏提示状态
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(() => {
    // 移动端/平板首次访问显示提示
    return (isMobile() || isTablet()) && isFullscreenSupported();
  });

  // 获取已配置的文字列表（使用 useMemo 稳定引用）
  const configuredTexts = useMemo(() => 
    sceneConfig.gestureTexts || 
    (sceneConfig.gestureText ? [sceneConfig.gestureText] : ['MERRY CHRISTMAS']),
    [sceneConfig.gestureTexts, sceneConfig.gestureText]
  );

  // 获取文字切换间隔（毫秒）
  const textSwitchIntervalMs = (sceneConfig.textSwitchInterval || 3) * 1000;

  // 同步配置到 refs（避免 useCallback 依赖变化）
  useEffect(() => {
    configuredTextsRef.current = configuredTexts;
    textSwitchIntervalRef.current = textSwitchIntervalMs;
    hideTreeConfigRef.current = sceneConfig.gestureEffect?.hideTree ?? true;
  }, [configuredTexts, textSwitchIntervalMs, sceneConfig.gestureEffect?.hideTree]);

  // 时间轴完成回调
  const handleTimelineComplete = useCallback(() => {
    setSceneState('FORMED');
  }, []);

  // 时间轴播放器
  const timeline = useTimeline(
    sceneConfig.timeline,
    shareData?.photos?.length || 0,
    handleTimelineComplete,
    configuredTexts
  );

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 加载分享数据
  useEffect(() => {
    const loadShare = async () => {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingStage('正在连接服务器...');
      setAssetsReady(false);
      
      // 模拟网络延迟的进度
      const progressTimer = setInterval(() => {
        setLoadingProgress(prev => Math.min(prev + 5, 30));
      }, 100);
      
      const data = await getShare(shareId);
      clearInterval(progressTimer);
      
      if (!data) {
        setError('分享不存在或已过期');
        setLoading(false);
        return;
      }
      
      setLoadingProgress(40);
      setLoadingStage('正在解析配置...');
      
      // 安全验证：清理配置和照片数据
      const sanitizedConfig = sanitizeShareConfig(data.config);
      const sanitizedPhotos = sanitizePhotos(data.photos);
      const sanitizedMessage = sanitizeText(data.message, 100);
      
      setLoadingProgress(50);
      setLoadingStage(`正在加载 ${sanitizedPhotos.length} 张照片...`);
      
      // 预加载照片
      if (sanitizedPhotos.length > 0) {
        const loadPromises = sanitizedPhotos.map((photo, index) => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              setLoadingProgress(50 + Math.floor((index + 1) / sanitizedPhotos.length * 30));
              resolve();
            };
            img.onerror = () => resolve(); // 即使失败也继续
            img.src = photo;
          });
        });
        await Promise.all(loadPromises);
      }
      
      setLoadingProgress(85);
      setLoadingStage('正在初始化 3D 场景...');
      
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
        
        // 如果启用了故事线模式，显示音乐提示
        if (cfg.timeline?.enabled && cfg.timeline.steps && cfg.timeline.steps.length > 0) {
          setShowSoundPrompt(true);
        }
        
        // 预加载音乐
        setLoadingStage('正在加载背景音乐...');
        const musicConfig = cfg.music;
        let musicUrl = CHRISTMAS_MUSIC_URL;
        
        console.log('SharePage music config:', {
          selected: musicConfig?.selected,
          hasCustomUrl: !!musicConfig?.customUrl,
          customUrlLength: musicConfig?.customUrl?.length,
          customUrlPreview: musicConfig?.customUrl?.substring(0, 100)
        });
        
        if (musicConfig) {
          if (musicConfig.selected === 'custom' && musicConfig.customUrl) {
            musicUrl = musicConfig.customUrl;
            console.log('Using custom music URL');
          } else {
            const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
            if (preset) musicUrl = preset.url;
            console.log('Using preset music:', musicConfig.selected);
          }
        }
        
        // 创建音频元素并预加载
        const preloadAudio = new Audio();
        preloadAudio.preload = 'auto';
        preloadAudio.src = musicUrl;
        
        // 设置音乐加载超时（5秒）
        const musicTimeout = setTimeout(() => {
          console.warn('Music preload timeout, continuing anyway');
          setMusicReady(true);
        }, 5000);
        
        preloadAudio.addEventListener('canplaythrough', () => {
          clearTimeout(musicTimeout);
          setLoadingProgress(95);
          setMusicReady(true);
        }, { once: true });
        
        preloadAudio.addEventListener('error', () => {
          clearTimeout(musicTimeout);
          console.warn('Music preload failed, continuing anyway');
          setMusicReady(true);
        }, { once: true });
        
        // 开始加载
        preloadAudio.load();
      } else {
        // 没有配置，直接标记音乐准备好
        setMusicReady(true);
      }
      
      setLoadingProgress(90);
      setLoadingStage('等待场景资源加载...');
      // 启动兜底计时器，防止 onAssetsLoaded 未回调导致卡死
      if (assetTimeoutRef.current) clearTimeout(assetTimeoutRef.current);
      assetTimeoutRef.current = setTimeout(() => {
        setAssetsReady(true);
      }, 5000);
    };
    
    loadShare();
    return () => {
      if (assetTimeoutRef.current) clearTimeout(assetTimeoutRef.current);
    };
  }, [shareId]);

  // 场景资源加载完成后再结束加载遮罩，避免装饰迟延出现
  useEffect(() => {
    if (!loading) return;
    // 需要场景资源和音乐都准备好
    if (assetsReady && musicReady) {
      setLoadingProgress(100);
      setLoadingStage('加载完成！');
      const timer = setTimeout(() => setLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [assetsReady, musicReady, loading]);

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
      textSwitchTimerRef.current = setInterval(() => {
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
      if (textSwitchTimerRef.current) clearInterval(textSwitchTimerRef.current);
    }, totalDuration);
    
    return () => {
      clearTimeout(timer);
      if (textSwitchTimerRef.current) clearInterval(textSwitchTimerRef.current);
    };
  }, [preloadTextPlayed, shareData, sceneConfig]);

  // 统一的文字特效控制函数（使用 refs 避免依赖变化）
  const startTextEffect = useCallback((duration?: number) => {
    // 清理之前的定时器
    if (textEffectTimerRef.current) {
      clearTimeout(textEffectTimerRef.current);
      textEffectTimerRef.current = null;
    }
    if (textSwitchTimerRef.current) {
      clearInterval(textSwitchTimerRef.current);
      textSwitchTimerRef.current = null;
    }

    const texts = configuredTextsRef.current;
    const switchInterval = textSwitchIntervalRef.current;
    const hideTree = hideTreeConfigRef.current;

    // 重置并显示
    setCurrentTextIndex(0);
    setShowText(true);
    setShowHeart(false);
    if (hideTree) setHideTree(true);

    // 如果有多条文字，启动轮播
    if (texts.length > 1) {
      let idx = 0;
      textSwitchTimerRef.current = setInterval(() => {
        idx = (idx + 1) % texts.length;
        setCurrentTextIndex(idx);
      }, switchInterval);
    }

    // 如果设置了持续时间，启动结束定时器
    if (duration && duration > 0) {
      textEffectTimerRef.current = setTimeout(() => {
        // 内联停止逻辑，避免调用 stopTextEffect
        if (textEffectTimerRef.current) {
          clearTimeout(textEffectTimerRef.current);
          textEffectTimerRef.current = null;
        }
        if (textSwitchTimerRef.current) {
          clearInterval(textSwitchTimerRef.current);
          textSwitchTimerRef.current = null;
        }
        setShowText(false);
        setCurrentTextIndex(0);
        if (hideTreeConfigRef.current) setHideTree(false);
        gestureActiveRef.current = false;
      }, duration);
    }
  }, []); // 空依赖数组，函数引用永远不变

  // stopTextEffect 保留用于未来扩展
  const _stopTextEffect = useCallback(() => {
    if (textEffectTimerRef.current) {
      clearTimeout(textEffectTimerRef.current);
      textEffectTimerRef.current = null;
    }
    if (textSwitchTimerRef.current) {
      clearInterval(textSwitchTimerRef.current);
      textSwitchTimerRef.current = null;
    }
    setShowText(false);
    setCurrentTextIndex(0);
    if (hideTreeConfigRef.current) setHideTree(false);
  }, []); // 空依赖数组，函数引用永远不变
  void _stopTextEffect; // 标记为已使用

  // 故事线步骤 - 简化版：文字特效只显示第一条，不轮播
  const prevTimelineStepRef = useRef<number>(-1);
  
  useEffect(() => {
    const { isPlaying, currentStep, currentStepIndex } = timeline.state;
    const prevStepIndex = prevTimelineStepRef.current;
    
    // 步骤变化时处理
    if (isPlaying && currentStepIndex !== prevStepIndex) {
      // 文字步骤 - 简化：只显示第一条文字
      if (currentStep?.type === 'text') {
        setCurrentTextIndex(0);
        setShowText(true);
        setShowHeart(false);
        setHideTree(true);
      }
      // 爱心步骤
      else if (currentStep?.type === 'heart') {
        setShowText(false);
        if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
        setShowHeart(true);
        setHideTree(true);

        // 故事线爱心步骤：将「持续时间」视为每张照片的中心预览时间
        const perPhoto = currentStep.duration || 0;
        setHeartStepIntervalOverride(perPhoto > 0 ? perPhoto : null);
      }
      // 礼物步骤 - 隐藏圣诞树，显示礼物盒
      else if (currentStep?.type === 'gift') {
        setShowText(false);
        setShowHeart(false);
        setHideTree(true);
      }
      // 语音步骤 - 隐藏圣诞树
      else if (currentStep?.type === 'voice') {
        setShowText(false);
        setShowHeart(false);
        setHideTree(true);
      }
      // 圣诞树步骤 - 显示圣诞树
      else if (currentStep?.type === 'tree') {
        setShowText(false);
        setShowHeart(false);
        setHideTree(false);
      }
      // 其他步骤（intro/photo）- 隐藏圣诞树
      else {
        setShowText(false);
        setShowHeart(false);
        setHideTree(true);
        setHeartStepIntervalOverride(null);
      }
    }
    
    // 停止播放时清理
    if (!isPlaying && prevStepIndex >= 0) {
      setShowText(false);
      setShowHeart(false);
      setHideTree(false);
      setHeartStepIntervalOverride(null);
    }
    
    prevTimelineStepRef.current = isPlaying ? currentStepIndex : -1;
  }, [timeline.state.isPlaying, timeline.state.currentStepIndex]);

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

  // 执行手势动作
  const executeGestureAction = useCallback((action: string) => {
    const effectConfig = sceneConfig.gestureEffect || { duration: 5000, hideTree: true };
    
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
      case 'text': {
        // 计算总时长：使用 refs 获取最新配置
        const texts = configuredTextsRef.current;
        const switchInterval = textSwitchIntervalRef.current;
        const totalDuration = texts.length > 1 
          ? Math.max(effectConfig.duration, texts.length * switchInterval)
          : effectConfig.duration;
        startTextEffect(totalDuration);
        break;
      }
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
      case 'screenshot': {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const link = document.createElement('a');
          link.download = 'christmas-tree.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
        break;
      }
      case 'reset':
        setSceneState('FORMED');
        rotationSpeedRef.current = 0;
        break;
      case 'themeClassic':
        setSceneConfig((prev) =>
          deepMergeConfig(
            prev as unknown as Record<string, unknown>,
            { ...THEME_PRESETS.classic, themeLabel: 'classic' } as unknown as Record<string, unknown>
          ) as unknown as SceneConfig
        );
        break;
      case 'themeIcy':
        setSceneConfig((prev) =>
          deepMergeConfig(
            prev as unknown as Record<string, unknown>,
            { ...THEME_PRESETS.icy, themeLabel: 'icy' } as unknown as Record<string, unknown>
          ) as unknown as SceneConfig
        );
        break;
      case 'themeCandy':
        setSceneConfig((prev) =>
          deepMergeConfig(
            prev as unknown as Record<string, unknown>,
            { ...THEME_PRESETS.candy, themeLabel: 'candy' } as unknown as Record<string, unknown>
          ) as unknown as SceneConfig
        );
        break;
      default:
        break;
    }
  }, [sceneConfig, startTextEffect]);

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

  // 处理捏合选择照片
  const handlePinch = useCallback((pos: { x: number; y: number }) => {
    // 锁定期间忽略捏合操作
    if (photoLocked) {
      return;
    }
    
    if (selectedPhotoIndex !== null) {
      // 已选中照片时，捏合取消选择
      setSelectedPhotoIndex(null);
    } else {
      // 未选中照片时，查找最近的照片
      let closestIndex = -1;
      let closestDist = Infinity;

      photoScreenPositionsRef.current.forEach((photoPos) => {
        if (photoPos) {
          const dx = photoPos.x - pos.x;
          const dy = photoPos.y - pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = photoPos.index;
          }
        }
      });

      // 放宽距离阈值从 0.15 到 0.25，提高选中成功率
      if (closestIndex >= 0 && closestDist < 0.25) {
        setSelectedPhotoIndex(closestIndex);
        // 启动锁定，锁定0.8秒（从1秒降低）
        setPhotoLocked(true);
        if (photoLockTimerRef.current) {
          clearTimeout(photoLockTimerRef.current);
        }
        photoLockTimerRef.current = setTimeout(() => {
          setPhotoLocked(false);
        }, 800);
      }
    }
  }, [selectedPhotoIndex, photoLocked]);

  // 处理手掌滑动控制视角
  const handlePalmMove = useCallback((deltaX: number, deltaY: number) => {
    // 照片锁定期间禁止相机移动
    if (photoLocked) return;
    // 直接更新 ref，避免触发 React 重新渲染
    palmMoveRef.current = { x: deltaX, y: deltaY };
  }, [photoLocked]);

  // 处理手势旋转速度控制 - 直接更新 Ref
  const handleRotationSpeedChange = useCallback((speed: number) => {
    rotationSpeedRef.current = speed;
  }, []);

  // 获取当前音乐的歌词 URL
  const getLrcUrl = useCallback(() => {
    const musicConfig = sceneConfig.music;
    if (!musicConfig) return '';
    
    // 自定义音乐没有歌词
    if (musicConfig.selected === 'custom') return '';
    
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.lrc || '';
  }, [sceneConfig.music]);

  // 获取当前音乐 URL
  const getMusicUrl = useCallback(() => {
    const musicConfig = sceneConfig.music;
    if (!musicConfig) return CHRISTMAS_MUSIC_URL;
    
    if (musicConfig.selected === 'custom' && musicConfig.customUrl) {
      return musicConfig.customUrl;
    }
    
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.url || CHRISTMAS_MUSIC_URL;
  }, [sceneConfig.music]);

  // 初始化音频 - 等待配置加载完成后再初始化
  useEffect(() => {
    // 等待分享数据加载完成
    if (loading || !shareData) return;
    
    const musicUrl = getMusicUrl();
    const volume = sceneConfig.music?.volume ?? 0.5;
    
    // 如果已有音频实例，更新它
    if (audioRef.current) {
      const currentSrc = audioRef.current.src;
      
      // 标准化 URL 进行比较
      const normalizeUrl = (url: string) => {
        // data URL 使用长度 + 前200字符作为唯一标识
        if (url.startsWith('data:')) {
          return `data:${url.length}:${url.substring(0, 200)}`;
        }
        // 普通 URL 移除查询参数和哈希
        try {
          const urlObj = new URL(url, window.location.href);
          return urlObj.pathname;
        } catch {
          return url;
        }
      };
      
      const currentNormalized = normalizeUrl(currentSrc);
      const newNormalized = normalizeUrl(musicUrl);
      
      // 特殊处理：如果新 URL 是 data URL 且当前不是，强制重新加载
      const isNewDataUrl = musicUrl.startsWith('data:');
      const isCurrentDataUrl = currentSrc.startsWith('data:');
      const needsReload = currentNormalized !== newNormalized || (isNewDataUrl && !isCurrentDataUrl);
      
      if (needsReload) {
        // 停止旧的更新循环
        if (audioLevelUpdateStopRef.current) {
          audioLevelUpdateStopRef.current();
          audioLevelUpdateStopRef.current = null;
        }
        
        // 清理旧的分析器
        if (audioAnalyserRef.current) {
          audioAnalyserRef.current.dispose();
          audioAnalyserRef.current = null;
        }
        
        // 清理旧的音频缓存并创建新的 Audio 元素
        const oldAudio = audioRef.current;
        clearAudioCache(oldAudio);
        oldAudio.pause();
        oldAudio.src = '';
        
        // 创建新的 Audio 元素
        const newAudio = new Audio(musicUrl);
        newAudio.loop = true;
        newAudio.volume = volume;
        newAudio.preload = 'auto';
        audioRef.current = newAudio;
        
        // 等待音频可以播放后再创建分析器和播放
        const handleCanPlay = () => {
          if (audioRef.current === newAudio) {
            // 创建分析器
            audioAnalyserRef.current = createAudioAnalyser(newAudio);
            if (audioAnalyserRef.current) {
              audioLevelUpdateStopRef.current = startAudioLevelUpdate(audioAnalyserRef.current, audioLevelRef);
            }
            // 自动播放
            if (!showTutorial && !showSoundPrompt && musicPlaying) {
              newAudio.play().catch(() => setMusicPlaying(false));
            }
          }
          newAudio.removeEventListener('canplaythrough', handleCanPlay);
        };
        
        newAudio.addEventListener('canplaythrough', handleCanPlay);
        
        // 如果音频已经可以播放，立即处理
        if (newAudio.readyState >= 3) {
          handleCanPlay();
        }
        
        // 开始加载
        newAudio.load();
        return;
      }
      
      audioRef.current.volume = volume;
      return;
    }
    
    // 创建新的音频实例
    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    // 等待音频可以播放后再创建分析器
    const handleCanPlay = () => {
      if (audioRef.current === audio) {
        // 创建音频分析器
        audioAnalyserRef.current = createAudioAnalyser(audio);
        if (audioAnalyserRef.current) {
          audioLevelUpdateStopRef.current = startAudioLevelUpdate(audioAnalyserRef.current, audioLevelRef);
        }
        
        // 教程或音乐提示显示时不播放音乐
        if (!showTutorial && !showSoundPrompt) {
          audio.play().catch(() => setMusicPlaying(false));
        }
      }
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
    
    audio.addEventListener('canplaythrough', handleCanPlay);
    
    // 如果音频已经可以播放，立即处理
    if (audio.readyState >= 3) {
      handleCanPlay();
    }
    
    // 开始加载
    audio.load();

    // 用户交互后尝试播放（处理浏览器自动播放限制）
    const handleInteraction = () => {
      // 教程或音乐提示显示时不自动播放
      if (showTutorial || showSoundPrompt) return;
      if (audioRef.current && audioRef.current.paused && musicPlaying) {
        audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {});
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      if (audioLevelUpdateStopRef.current) {
        audioLevelUpdateStopRef.current();
        audioLevelUpdateStopRef.current = null;
      }
      if (audioAnalyserRef.current) {
        audioAnalyserRef.current.dispose();
        audioAnalyserRef.current = null;
      }
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, shareData, sceneConfig.music?.selected, sceneConfig.music?.volume]);
  
  // 组件卸载时清理音频
  useEffect(() => {
    return () => {
      if (audioLevelUpdateStopRef.current) {
        audioLevelUpdateStopRef.current();
        audioLevelUpdateStopRef.current = null;
      }
      if (audioAnalyserRef.current) {
        audioAnalyserRef.current.dispose();
        audioAnalyserRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 教程关闭后开始播放音乐
  useEffect(() => {
    if (!showTutorial && audioRef.current && musicPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [showTutorial, musicPlaying]);

  // 播放/暂停音乐
  const toggleMusic = useCallback(() => {
    if (!audioRef.current) {
      // 如果音频实例不存在，尝试重新创建
      const musicUrl = getMusicUrl();
      const volume = sceneConfig.music?.volume ?? 0.5;
      const audio = new Audio(musicUrl);
      audio.loop = true;
      audio.volume = volume;
      audio.preload = 'auto';
      audioRef.current = audio;
      
      audio.addEventListener('canplaythrough', () => {
        audioAnalyserRef.current = createAudioAnalyser(audio);
        if (audioAnalyserRef.current) {
          audioLevelUpdateStopRef.current = startAudioLevelUpdate(audioAnalyserRef.current, audioLevelRef);
        }
        audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
      }, { once: true });
      
      audio.load();
      return;
    }
    
    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      // 确保音频已加载
      if (audioRef.current.readyState >= 3) {
        audioRef.current.play()
          .then(() => setMusicPlaying(true))
          .catch(e => {
            console.log('Audio play failed:', e);
            setMusicPlaying(false);
          });
      } else {
        // 等待加载完成后播放
        const handleCanPlay = () => {
          audioRef.current?.play()
            .then(() => setMusicPlaying(true))
            .catch(() => setMusicPlaying(false));
          audioRef.current?.removeEventListener('canplaythrough', handleCanPlay);
        };
        audioRef.current.addEventListener('canplaythrough', handleCanPlay);
        audioRef.current.load();
      }
    }
  }, [musicPlaying, getMusicUrl, sceneConfig.music?.volume]);

  // 时间轴播放时切换音乐
  const previousMusicRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    const timelineMusic = sceneConfig.timeline?.music;
    const isPlaying = timeline.state.isPlaying;
    const volume = sceneConfig.music?.volume ?? 0.5;
    
    if (isPlaying && timelineMusic) {
      // 保存当前音乐ID，开始播放时间轴音乐
      if (previousMusicRef.current === null) {
        previousMusicRef.current = sceneConfig.music?.selected || 'default';
      }
      
      const preset = PRESET_MUSIC.find(m => m.id === timelineMusic);
      if (preset && !audioRef.current.src.includes(preset.url.split('/').pop() || '')) {
        // 停止旧的更新循环
        if (audioLevelUpdateStopRef.current) {
          audioLevelUpdateStopRef.current();
          audioLevelUpdateStopRef.current = null;
        }
        
        // 清理旧的分析器
        if (audioAnalyserRef.current) {
          audioAnalyserRef.current.dispose();
          audioAnalyserRef.current = null;
        }
        
        const wasPlaying = !audioRef.current.paused;
        
        // 清理旧的音频缓存并创建新的 Audio 元素
        const oldAudio = audioRef.current;
        clearAudioCache(oldAudio);
        oldAudio.pause();
        oldAudio.src = '';
        
        // 创建新的 Audio 元素
        const newAudio = new Audio(preset.url);
        newAudio.loop = true;
        newAudio.volume = volume;
        audioRef.current = newAudio;
        
        // 等待音频加载完成后再创建分析器
        const handleLoadedData = () => {
          if (audioRef.current) {
            audioAnalyserRef.current = createAudioAnalyser(audioRef.current);
            if (audioAnalyserRef.current) {
              audioLevelUpdateStopRef.current = startAudioLevelUpdate(audioAnalyserRef.current, audioLevelRef);
            }
          }
          newAudio.removeEventListener('loadeddata', handleLoadedData);
        };
        
        newAudio.addEventListener('loadeddata', handleLoadedData);
        
        // 如果音频已经加载完成，立即创建分析器
        if (newAudio.readyState >= 2) {
          handleLoadedData();
        }
        
        if (wasPlaying) {
          newAudio.play().catch(() => {});
        }
      }
    } else if (!isPlaying && previousMusicRef.current !== null) {
      // 停止时恢复原来配置的音乐
      // 停止旧的更新循环
      if (audioLevelUpdateStopRef.current) {
        audioLevelUpdateStopRef.current();
        audioLevelUpdateStopRef.current = null;
      }
      
      // 清理旧的分析器
      if (audioAnalyserRef.current) {
        audioAnalyserRef.current.dispose();
        audioAnalyserRef.current = null;
      }
      
      const wasPlaying = !audioRef.current.paused;
      const originalMusicUrl = getMusicUrl(); // 使用配置的音乐
      
      // 清理旧的音频缓存并创建新的 Audio 元素
      const oldAudio = audioRef.current;
      clearAudioCache(oldAudio);
      oldAudio.pause();
      oldAudio.src = '';
      
      // 创建新的 Audio 元素
      const newAudio = new Audio(originalMusicUrl);
      newAudio.loop = true;
      newAudio.volume = volume;
      audioRef.current = newAudio;
      
      // 等待音频加载完成后再创建分析器
      const handleLoadedData = () => {
        if (audioRef.current) {
          audioAnalyserRef.current = createAudioAnalyser(audioRef.current);
          if (audioAnalyserRef.current) {
            audioLevelUpdateStopRef.current = startAudioLevelUpdate(audioAnalyserRef.current, audioLevelRef);
          }
        }
        newAudio.removeEventListener('loadeddata', handleLoadedData);
      };
      
      newAudio.addEventListener('loadeddata', handleLoadedData);
      
      // 如果音频已经加载完成，立即创建分析器
      if (newAudio.readyState >= 2) {
        handleLoadedData();
      }
      
      if (wasPlaying) {
        newAudio.play().catch(() => {});
      }
      previousMusicRef.current = null;
    }
  }, [timeline.state.isPlaying, sceneConfig.timeline?.music, sceneConfig.music?.selected, getMusicUrl]);

  // 加载中
  if (loading) {
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
        fontFamily: 'sans-serif',
        gap: '24px',
        padding: '20px'
      }}>
        {/* 圣诞树图标 */}
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎄</div>
        
        {/* 标题 */}
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
          正在加载圣诞树
        </div>
        
        {/* 进度条容器 */}
        <div style={{
          width: '280px',
          maxWidth: '80vw',
          height: '8px',
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          {/* 进度条 */}
          <div style={{
            width: `${loadingProgress}%`,
            height: '100%',
            backgroundColor: '#FFD700',
            borderRadius: '4px',
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
          }} />
        </div>
        
        {/* 进度百分比 */}
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255, 215, 0, 0.8)',
          marginTop: '-12px'
        }}>
          {loadingProgress}%
        </div>
        
        {/* 当前阶段 */}
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255, 255, 255, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Loader size={16} className="spin" />
          {loadingStage}
        </div>
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
      {/* 开场文案 - 时间轴模式下由时间轴控制 */}
      {!sceneConfig.timeline?.enabled && sceneConfig.intro?.enabled && !introShown && (
        <IntroOverlay
          text={sceneConfig.intro.text}
          subText={sceneConfig.intro.subText}
          duration={sceneConfig.intro.duration}
          onComplete={() => setIntroShown(true)}
        />
      )}

      {/* 时间轴模式 - 开场文案 */}
      <IntroOverlay
        text={timeline.introText || ''}
        subText={timeline.introSubText}
        duration={timeline.state.currentStep?.duration || 3000}
        onComplete={() => {}}
        enabled={timeline.showIntro}
      />

      {/* 时间轴模式 - 居中照片展示 */}
      <CenterPhoto
        src={shareData.photos[timeline.photoIndex] || ''}
        visible={timeline.showPhoto}
        duration={timeline.state.currentStep?.duration}
      />

      {/* 时间轴模式 - 礼物步骤 */}
      {timeline.showGift && timeline.giftConfig && (
        <GiftStepOverlay
          isWaiting={timeline.isGiftWaiting}
          isOpen={timeline.isGiftOpen}
          message={timeline.giftConfig.message}
          messageDuration={timeline.giftConfig.messageDuration}
          onMessageComplete={timeline.onGiftMessageComplete}
        />
      )}

      {/* 时间轴模式 - 语音步骤 */}
      <VoicePlayer
        audioData={timeline.voiceConfig?.audioData}
        audioUrl={timeline.voiceConfig?.audioUrl}
        visible={timeline.showVoice}
        showIndicator={timeline.voiceConfig?.showIndicator}
        onComplete={timeline.onVoiceComplete}
      />

      {/* 时间轴模式 - 书信步骤 */}
      <LetterStepOverlay
        visible={timeline.showLetter}
        content={timeline.letterConfig?.content || ''}
        speed={timeline.letterConfig?.speed}
        fontSize={timeline.letterConfig?.fontSize}
        color={timeline.letterConfig?.color}
        onComplete={timeline.onLetterComplete}
      />

      {/* 3D Canvas - 教程或音乐提示显示时暂停渲染 */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas
          key={glResetKey}
          dpr={mobile ? 1 : isTablet() ? 1.5 : [1, 2]}
          gl={glConfig}
          shadows={false}
          frameloop={(showTutorial || (showSoundPrompt && !soundPromptDismissed)) ? 'never' : 'always'}
          onCreated={(state) => {
            const canvas = state.gl.domElement;
            const handleLost = (event: Event) => handleWebglContextLost(event);
            canvas.addEventListener('webglcontextlost', handleLost, { passive: false });
          }}
        >
          <Experience
            sceneState={timeline.showTree ? 'FORMED' : sceneState}
            rotationSpeed={rotationSpeedRef}
            palmMoveRef={palmMoveRef}
            config={sceneConfig}
            selectedPhotoIndex={selectedPhotoIndex}
            onPhotoSelect={setSelectedPhotoIndex}
            photoPaths={shareData.photos}
            onPhotoScreenPositions={(positions) => {
              photoScreenPositionsRef.current = positions;
            }}
            showHeart={showHeart}
            showText={showText}
            customMessage={(sceneConfig.gestureTexts || [sceneConfig.gestureText || shareData.message || 'MERRY CHRISTMAS'])[currentTextIndex] || 'MERRY CHRISTMAS'}
            hideTree={hideTree || timeline.showGift || timeline.showVoice}
            heartCount={sceneConfig.gestureEffect?.heartCount || 1500}
            textCount={sceneConfig.gestureEffect?.textCount || 1000}
            heartCenterPhoto={timeline.heartPhotoIndex !== null ? shareData.photos[timeline.heartPhotoIndex] : undefined}
            heartCenterPhotos={shareData.photos.length > 0 ? shareData.photos : undefined}
            heartPhotoInterval={(sceneConfig.heartEffect as { photoInterval?: number } | undefined)?.photoInterval || 3000}
            heartPhotoIntervalOverride={heartStepIntervalOverride}
            heartBottomText={(sceneConfig.heartEffect as { bottomText?: string } | undefined)?.bottomText}
            showGiftBox={timeline.showGift}
            giftBoxConfig={timeline.giftConfig ? {
              boxColor: timeline.giftConfig.boxColor,
              ribbonColor: timeline.giftConfig.ribbonColor
            } : undefined}
            isGiftWaiting={timeline.isGiftWaiting}
            isGiftOpen={timeline.isGiftOpen}
            onGiftOpen={timeline.onGiftOpen}
            audioLevelRef={audioLevelRef}
            onAssetsLoaded={() => setAssetsReady(true)}
            disableAutoRotate={showHeart || showText || timeline.state.isPlaying}
          />
        </Canvas>
      </div>

      {/* 手势控制器 - 教程显示时禁用 */}
      <GestureController
        onGesture={handleGestureChange}
        onMove={handleRotationSpeedChange}
        onStatus={setAiStatus}
        debugMode={false}
        enabled={!showTutorial}
        isPhotoSelected={selectedPhotoIndex !== null}
        photoLocked={photoLocked}
        onPinch={handlePinch}
        onPalmMove={handlePalmMove}
        palmSpeed={sceneConfig.cameraSensitivity || 25}
        zoomSpeed={sceneConfig.zoomSpeed || 100}
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

        {/* 全屏按钮 - 移动端/平板显示 */}
        {(mobile || isTablet()) && isFullscreenSupported() && (
          <button 
            onClick={() => toggleFullscreen()} 
            style={buttonStyle(isFullscreenMode, mobile)}
            title={isFullscreenMode ? '退出全屏' : '全屏'}
          >
            {isFullscreenMode ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )}

        <button onClick={() => setShowTutorial(true)} style={buttonStyle(false, mobile)} title="使用帮助">
          <HelpCircle size={18} />
        </button>

        <button
          onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')}
          style={{ ...buttonStyle(false, mobile), padding: mobile ? '12px 24px' : '12px 30px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sceneState === 'CHAOS' ? <><TreePine size={18} /> 聚合</> : <><Sparkles size={18} /> 散开</>}
        </button>

        {/* 时间轴播放按钮 */}
        {sceneConfig.timeline?.enabled && sceneConfig.timeline.steps.length > 0 && (
          <button
            onClick={() => {
              if (timeline.state.isPlaying) {
                timeline.actions.stop();
              } else {
                timeline.actions.play();
              }
            }}
            style={{ 
              ...buttonStyle(timeline.state.isPlaying, mobile), 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              background: timeline.state.isPlaying ? '#E91E63' : 'rgba(0,0,0,0.7)',
              borderColor: '#E91E63'
            }}
            title={timeline.state.isPlaying ? '停止故事线' : '播放故事线'}
          >
            <Play size={18} />
          </button>
        )}
      </div>

      {/* AI 加载状态 - 加载中时显示更明显的提示 */}
      {(aiStatus.includes('LOADING') || aiStatus.includes('REQUESTING')) && (
        <div style={{
          position: 'fixed',
          bottom: mobile ? '100px' : '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: '#FFD700',
          padding: '12px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 200,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 215, 0, 0.3)'
        }}>
          <Loader size={18} className="spin" />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {aiStatus.includes('LOADING') ? '正在加载 AI 手势识别...' : '正在请求摄像头权限...'}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
              {aiStatus.includes('LOADING') ? '首次加载可能需要几秒钟' : '请允许摄像头访问以启用手势控制'}
            </div>
          </div>
        </div>
      )}

      {/* AI 状态 - 顶部小标签 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: aiStatus.includes('ERROR') || aiStatus.includes('DISABLED') || aiStatus.includes('DENIED') 
          ? '#888' 
          : aiStatus.includes('READY') 
            ? 'rgba(100, 255, 100, 0.6)' 
            : 'rgba(255, 215, 0, 0.4)',
        fontSize: '10px',
        letterSpacing: '2px',
        zIndex: 10,
        background: 'rgba(0,0,0,0.5)',
        padding: '4px 8px',
        borderRadius: '4px'
      }}>
        {aiStatus === 'AI READY' ? '✓ AI 就绪' : aiStatus} {currentGesture && `| ${currentGesture}`}
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

      {/* 歌词显示 */}
      {sceneConfig.music && (
        <LyricsDisplay
          lrcUrl={getLrcUrl()}
          audioRef={audioRef}
          visible={!!getLrcUrl() && (sceneConfig.music.showLyrics !== false)}
        />
      )}

      {/* 使用教程 */}
      {showTutorial && <WelcomeTutorial onClose={() => setShowTutorial(false)} isSharePage gestureConfig={sceneConfig.gestures} />}

      {/* 全屏横屏提示 - 移动端/平板首次访问 */}
      {showFullscreenPrompt && !showTutorial && !showSoundPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 250,
          gap: '16px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '10px' }}>
            📱
          </div>
          <div style={{
            color: '#FFD700',
            fontSize: mobile ? '20px' : '24px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            获得最佳体验
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: mobile ? '14px' : '16px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            maxWidth: '320px',
            lineHeight: 1.6
          }}>
            建议使用全屏横屏模式观看，效果更佳！
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', width: '100%', maxWidth: '280px' }}>
            <button
              onClick={async () => {
                setShowFullscreenPrompt(false);
                // 尝试进入全屏并锁定横屏
                const success = await enterFullscreen();
                if (success) {
                  setIsFullscreenMode(true);
                  // 尝试锁定横屏（可能不支持）
                  await lockLandscape();
                }
              }}
              style={{
                padding: '14px 24px',
                backgroundColor: '#FFD700',
                border: 'none',
                borderRadius: '25px',
                color: '#000',
                fontSize: mobile ? '15px' : '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
              }}
            >
              <Maximize size={18} /> 全屏横屏观看
            </button>
            
            <button
              onClick={() => setShowFullscreenPrompt(false)}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '25px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: mobile ? '13px' : '14px',
                cursor: 'pointer',
                fontFamily: 'sans-serif'
              }}
            >
              稍后再说
            </button>
          </div>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            marginTop: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <RotateCcw size={14} /> 可随时点击底部按钮切换全屏
          </div>
        </div>
      )}

      {/* 音乐提示 - 故事线模式 */}
      {showSoundPrompt && !soundPromptDismissed && !showTutorial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          gap: '20px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '10px'
          }}>
            🎄
          </div>
          <div style={{
            color: '#FFD700',
            fontSize: mobile ? '18px' : '22px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            padding: '0 20px',
            maxWidth: '400px',
            lineHeight: 1.6
          }}>
            有人为你准备了一份特别的圣诞礼物
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: mobile ? '14px' : '16px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            marginTop: '5px'
          }}>
            建议打开声音获得最佳体验 🔊
          </div>
          <button
            onClick={() => {
              setSoundPromptDismissed(true);
              setShowSoundPrompt(false);
              // 播放音乐
              if (audioRef.current) {
                audioRef.current.play().then(() => {
                  setMusicPlaying(true);
                  // 自动开始播放故事线
                  setTimeout(() => {
                    timeline.actions.play();
                  }, 500);
                }).catch(() => {
                  setMusicPlaying(false);
                  // 即使音乐播放失败也开始故事线
                  setTimeout(() => {
                    timeline.actions.play();
                  }, 500);
                });
              } else {
                // 没有音频也开始故事线
                setTimeout(() => {
                  timeline.actions.play();
                }, 500);
              }
            }}
            style={{
              marginTop: '20px',
              padding: '16px 48px',
              backgroundColor: '#FFD700',
              border: 'none',
              borderRadius: '30px',
              color: '#000',
              fontSize: mobile ? '16px' : '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontFamily: 'sans-serif',
              boxShadow: '0 4px 20px rgba(255, 215, 0, 0.4)'
            }}
          >
            开始播放 ▶
          </button>
          <button
            onClick={() => {
              setSoundPromptDismissed(true);
              setShowSoundPrompt(false);
            }}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: mobile ? '12px' : '14px',
              cursor: 'pointer',
              fontFamily: 'sans-serif'
            }}
          >
            跳过，自己探索
          </button>
        </div>
      )}
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