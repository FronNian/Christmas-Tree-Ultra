import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience, GestureController, SettingsPanel, TitleOverlay, Modal, LyricsDisplay, AvatarCropper, IntroOverlay, WelcomeTutorial, PrivacyNotice, CenterPhoto, photoScreenPositions } from './components';
import { CHRISTMAS_MUSIC_URL } from './config';
import { isMobile, isTablet, fileToBase64, getDefaultSceneConfig, toggleFullscreen, isFullscreen, isFullscreenSupported } from './utils/helpers';
import { useTimeline } from './hooks/useTimeline';
import { 
  uploadShare, getLocalShare, getShareUrl, updateShare, getShare,
  saveLocalConfig, getLocalConfig, saveLocalPhotos, getLocalPhotos,
  refreshShareExpiry, deleteShare, clearLocalShare
} from './lib/r2';
import type { SceneState, SceneConfig, GestureConfig, GestureAction, MusicConfig } from './types';
import { PRESET_MUSIC } from './types';
import { Volume2, VolumeX, Camera, Settings, Wrench, Link, TreePine, Sparkles, Loader, HelpCircle, Shield, Heart, Type, Play, Maximize, Minimize } from 'lucide-react';

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

export default function GrandTreeApp() {
  const mobile = isMobile();
  const isShareMode = false; // TODO: 后续添加路由支持

  // 场景状态
  const [sceneState, setSceneState] = useState<SceneState>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [palmMove, setPalmMove] = useState<{ x: number; y: number } | undefined>(undefined);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 手势效果状态
  const [showHeart, setShowHeart] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentGesture, setCurrentGesture] = useState<string>('');
  
  // 爱心特效暂停状态（由 HeartParticles 组件控制）
  const [, setHeartPaused] = useState(false);

  // 头像裁剪状态
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null);

  // 开场文案状态
  const [introShown, setIntroShown] = useState(false);

  // 时间轴完成回调
  const handleTimelineComplete = useCallback(() => {
    setSceneState('FORMED');
  }, []);

  // 教程状态 - 首次访问显示
  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return !localStorage.getItem('welcome_tutorial_seen');
    } catch {
      return true;
    }
  });

  // 隐私政策弹窗
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textSwitchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 配置 refs（避免 useCallback 依赖变化导致重新创建）
  const configuredTextsRef = useRef<string[]>([]);
  const textSwitchIntervalRef = useRef<number>(3000);
  const hideTreeConfigRef = useRef<boolean>(true);
  
  // 手势状态 refs
  const lastGestureRef = useRef<string>('');
  const gestureActiveRef = useRef<boolean>(false);

  // 默认手势配置
  const defaultGestures: GestureConfig = {
    Closed_Fist: 'formed',
    Open_Palm: 'chaos',
    Pointing_Up: 'music',
    Thumb_Down: 'zoomOut',
    Thumb_Up: 'zoomIn',
    Victory: 'text',
    ILoveYou: 'heart',
    Pinch: 'none'
  };

  // 默认音乐配置
  const defaultMusic: MusicConfig = {
    selected: 'christmas-stars',
    volume: 0.5
  };

  // 场景配置 - 初始化时尝试从本地读取
  const [sceneConfig, setSceneConfig] = useState<SceneConfig>(() => {
    const savedConfig = getLocalConfig();
    // 使用统一的默认配置函数（移动端/平板自动使用最低配置）
    const defaultConfig = getDefaultSceneConfig() as unknown as SceneConfig;
    
    if (savedConfig) {
      // 深度合并配置，确保所有字段都有值
      return deepMergeConfig(defaultConfig as unknown as Record<string, unknown>, savedConfig as Record<string, unknown>) as unknown as SceneConfig;
    }
    return defaultConfig;
  });
  
  // 全屏状态
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  
  // 演示模式状态（隐藏鼠标和所有UI）
  const [demoMode, setDemoMode] = useState(false);
  
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
  
  // 演示模式键盘监听：D 进入，Esc 退出（基础监听，不依赖其他函数）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // D 键进入演示模式
      if (e.key === 'd' || e.key === 'D') {
        // 如果正在输入文字，不触发
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        setDemoMode(true);
      }
      // Esc 键退出演示模式（指针锁定退出时也会触发）
      if (e.key === 'Escape') {
        setDemoMode(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  

  


  // 初始化照片
  const [configLoaded, setConfigLoaded] = useState(false);

  // 是否隐藏圣诞树（显示特效时）
  const [hideTree, setHideTree] = useState(false);

  // 获取已配置的文字列表（使用 useMemo 稳定引用）
  const configuredTexts = useMemo(() => 
    sceneConfig.gestureTexts || 
    (sceneConfig.gestureText ? [sceneConfig.gestureText] : ['MERRY CHRISTMAS']),
    [sceneConfig.gestureTexts, sceneConfig.gestureText]
  );

  // 获取照片轮播间隔配置
  const heartPhotoInterval = (sceneConfig.heartEffect as { photoInterval?: number } | undefined)?.photoInterval || 3000;

  // 获取文字切换间隔（毫秒）
  const textSwitchIntervalMs = (sceneConfig.textSwitchInterval || 3) * 1000;
  
  // 同步配置到 refs（避免 useCallback 依赖变化）
  // 同步配置到 refs（避免 useCallback 依赖变化）
  useEffect(() => {
    configuredTextsRef.current = configuredTexts;
    textSwitchIntervalRef.current = textSwitchIntervalMs;
    hideTreeConfigRef.current = sceneConfig.gestureEffect?.hideTree ?? true;
  }, [configuredTexts, textSwitchIntervalMs, sceneConfig.gestureEffect?.hideTree]);

  // 统一的文字特效控制函数（使用 refs 避免依赖变化）
  // 必须在 timeline useEffect 之前定义
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
        // 内联停止逻辑
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

  const stopTextEffect = useCallback(() => {
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

  // 时间轴播放器
  const timeline = useTimeline(
    sceneConfig.timeline,
    uploadedPhotos.length,
    handleTimelineComplete,
    configuredTexts,
    heartPhotoInterval
  );

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
      }
      // 其他步骤（intro/photo/tree）- 关闭特效
      else {
        setShowText(false);
        setShowHeart(false);
        if (currentStep?.type !== 'tree') {
          setHideTree(currentStep?.type === 'intro' || currentStep?.type === 'photo');
        } else {
          setHideTree(false);
        }
      }
    }
    
    // 停止播放时清理
    if (!isPlaying && prevStepIndex >= 0) {
      setShowText(false);
      setShowHeart(false);
      setHideTree(false);
    }
    
    prevTimelineStepRef.current = isPlaying ? currentStepIndex : -1;
  }, [timeline.state.isPlaying, timeline.state.currentStepIndex]);

  // 处理图片上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 转换为数组，确保移动端兼容性
    const fileArray = Array.from(files);
    console.log(`选择了 ${fileArray.length} 个文件`);
    
    // 并行处理所有图片
    const promises = fileArray
      .filter(file => file.type.startsWith('image/'))
      .map(async (file) => {
        try {
          const base64 = await fileToBase64(file);
          return base64;
        } catch (err) {
          console.error('Failed to convert image:', err);
          return null;
        }
      });
    
    const results = await Promise.all(promises);
    const newPhotos = results.filter((p): p is string => p !== null);
    
    console.log(`成功处理 ${newPhotos.length} 张图片`);

    if (newPhotos.length > 0) {
      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      setRefreshKey(k => k + 1);
    }
    
    // 重置 input，确保下次可以选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 执行手势动作
  const executeGestureAction = useCallback((action: GestureAction) => {
    const effectConfig = sceneConfig.gestureEffect || {
      duration: 3000,
      hideTree: true,
      textCount: 1000,
      heartCount: 1500
    };
    
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
        
        // 计算爱心特效持续时间
        const photoInterval = (sceneConfig.heartEffect as { photoInterval?: number } | undefined)?.photoInterval || 3000;
        const photoCount = uploadedPhotos.length || 1;
        // 多张照片时：环绕5秒 + 收缩0.8秒 + 轮播时间
        const hasMultiplePhotos = photoCount > 1;
        const heartDuration = hasMultiplePhotos 
          ? 5000 + 800 + (photoCount * photoInterval) + effectConfig.duration
          : effectConfig.duration + 2000;
        
        heartTimeoutRef.current = setTimeout(() => {
          setShowHeart(false);
          if (effectConfig.hideTree) setHideTree(false);
          gestureActiveRef.current = false; // 效果结束，允许再次触发
        }, heartDuration);
        break;
      case 'text': {
        // 计算总时长：如果有多条文字，至少显示完一轮
        const texts = configuredTextsRef.current;
        const switchInterval = textSwitchIntervalRef.current;
        const totalDuration = texts.length > 1 
          ? Math.max(effectConfig.duration, texts.length * switchInterval)
          : effectConfig.duration;
        startTextEffect(totalDuration);
        break;
      }
      case 'music':
        // 直接操作音频
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
        // 截图功能
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
  }, [sceneConfig, uploadedPhotos, startTextEffect]);

  // 手动触发特效（按钮触发，支持切换开关）
  const triggerEffect = useCallback((effect: 'heart' | 'text') => {
    // 如果当前特效正在显示，则关闭它
    if (effect === 'heart' && showHeart) {
      setShowHeart(false);
      setHideTree(false);
      setHeartPaused(false);
      if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
      return;
    }
    if (effect === 'text' && showText) {
      stopTextEffect();
      return;
    }
    // 否则触发特效
    executeGestureAction(effect);
  }, [showHeart, showText, executeGestureAction, stopTextEffect]);

  // 处理手势变化
  const handleGestureChange = useCallback((gesture: string) => {
    setCurrentGesture(gesture);
    
    const gestures = sceneConfig.gestures || defaultGestures;
    const action = gestures[gesture as keyof GestureConfig];
    
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

  // 处理捏合 - 爱心特效时暂停/继续，普通模式选择照片
  const handlePinch = useCallback((_pos: { x: number; y: number }) => {
    // 爱心特效显示时，捏合暂停/继续
    if (showHeart) {
      setHeartPaused(prev => !prev);
      return;
    }
    
    // 普通模式下的照片选择
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex(null);
    } else {
      let closestIndex = 0;
      let closestDist = Infinity;

      photoScreenPositions.forEach((photoPos) => {
        if (photoPos) {
          const dx = photoPos.x - _pos.x;
          const dy = photoPos.y - _pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = photoPos.index;
          }
        }
      });

      if (closestDist < 0.15) {
        setSelectedPhotoIndex(closestIndex);
      }
    }
  }, [selectedPhotoIndex, showHeart]);

  // 处理手掌滑动控制视角
  const handlePalmMove = useCallback((deltaX: number, deltaY: number) => {
    setPalmMove({ x: deltaX, y: deltaY });
    // 短暂后清除，让下一帧可以继续接收新的移动
    setTimeout(() => setPalmMove(undefined), 50);
  }, []);

  // 获取当前音乐 URL
  const getMusicUrl = useCallback(() => {
    const musicConfig = sceneConfig.music || defaultMusic;
    if (musicConfig.selected === 'custom' && musicConfig.customUrl) {
      return musicConfig.customUrl;
    }
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.url || CHRISTMAS_MUSIC_URL;
  }, [sceneConfig.music]);

  // 获取当前歌词 URL
  const getLrcUrl = useCallback(() => {
    const musicConfig = sceneConfig.music || defaultMusic;
    if (musicConfig.selected === 'custom') {
      return ''; // 自定义音乐暂不支持歌词
    }
    const preset = PRESET_MUSIC.find(m => m.id === musicConfig.selected);
    return preset?.lrc || '';
  }, [sceneConfig.music]);

  // 初始化音频
  useEffect(() => {
    const musicUrl = getMusicUrl();
    const volume = sceneConfig.music?.volume ?? 0.5;
    
    audioRef.current = new Audio(musicUrl);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;

    const playAudio = () => {
      audioRef.current?.play().catch(() => setMusicPlaying(false));
    };
    playAudio();

    const handleInteraction = () => {
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

  // 音量变化时更新（不触发重新加载）
  useEffect(() => {
    if (!audioRef.current) return;
    const volume = sceneConfig.music?.volume ?? 0.5;
    audioRef.current.volume = volume;
  }, [sceneConfig.music?.volume]);

  // 音乐选择变化时重新加载
  useEffect(() => {
    if (!audioRef.current) return;
    
    const musicUrl = getMusicUrl();
    const wasPlaying = !audioRef.current.paused;
    
    // 检查是否需要切换音乐源
    const currentSrc = audioRef.current.src;
    const needsReload = 
      (musicUrl.startsWith('data:') && !currentSrc.startsWith('data:')) ||
      (!musicUrl.startsWith('data:') && !currentSrc.includes(encodeURIComponent(musicUrl.split('/').pop() || '')));
    
    if (needsReload) {
      audioRef.current.src = musicUrl;
      audioRef.current.currentTime = 0;
      if (wasPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [sceneConfig.music?.selected, sceneConfig.music?.customUrl, getMusicUrl]);

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

  // 时间轴播放时切换音乐
  const previousMusicRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!audioRef.current) return;
    
    const timelineMusic = sceneConfig.timeline?.music;
    const isPlaying = timeline.state.isPlaying;
    
    if (isPlaying && timelineMusic) {
      // 保存当前音乐，开始播放时间轴音乐
      if (previousMusicRef.current === null) {
        previousMusicRef.current = sceneConfig.music?.selected || 'christmas-stars';
      }
      
      const preset = PRESET_MUSIC.find(m => m.id === timelineMusic);
      if (preset && audioRef.current.src !== preset.url) {
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.src = preset.url;
        audioRef.current.currentTime = 0;
        if (wasPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    } else if (!isPlaying && previousMusicRef.current !== null) {
      // 停止时恢复原来的音乐
      const preset = PRESET_MUSIC.find(m => m.id === previousMusicRef.current);
      if (preset) {
        const wasPlaying = !audioRef.current.paused;
        audioRef.current.src = preset.url;
        audioRef.current.currentTime = 0;
        if (wasPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
      previousMusicRef.current = null;
    }
  }, [timeline.state.isPlaying, sceneConfig.timeline?.music, sceneConfig.music?.selected]);

  // 演示模式下的快捷键
  useEffect(() => {
    if (!demoMode) return;
    
    const handleDemoKeyDown = (e: KeyboardEvent) => {
      // 空格键切换聚合/散开
      if (e.key === ' ') {
        e.preventDefault();
        setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS');
      }
      // H 键显示爱心
      if (e.key === 'h' || e.key === 'H') {
        triggerEffect('heart');
      }
      // T 键显示文字
      if (e.key === 't' || e.key === 'T') {
        triggerEffect('text');
      }
      // M 键切换音乐
      if (e.key === 'm' || e.key === 'M') {
        toggleMusic();
      }
      // 数字键 1-9 选择照片，0 取消选择
      if (e.key >= '1' && e.key <= '9') {
        const photoIndex = parseInt(e.key) - 1;
        if (photoIndex < uploadedPhotos.length) {
          setSelectedPhotoIndex(photoIndex);
        }
      }
      if (e.key === '0') {
        setSelectedPhotoIndex(null);
      }
      // 左右方向键切换照片
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (uploadedPhotos.length > 0) {
          setSelectedPhotoIndex(prev => {
            if (prev === null) {
              return e.key === 'ArrowRight' ? 0 : uploadedPhotos.length - 1;
            }
            if (e.key === 'ArrowRight') {
              return (prev + 1) % uploadedPhotos.length;
            } else {
              return (prev - 1 + uploadedPhotos.length) % uploadedPhotos.length;
            }
          });
        }
      }
    };
    
    document.addEventListener('keydown', handleDemoKeyDown);
    return () => document.removeEventListener('keydown', handleDemoKeyDown);
  }, [demoMode, triggerEffect, toggleMusic, uploadedPhotos.length]);

  // 分享状态
  const [isSharing, setIsSharing] = useState(false);
  
  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'alert' | 'confirm' | 'share' | 'error'>('alert');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalShareUrl, setModalShareUrl] = useState('');
  const [modalShareInfo, setModalShareInfo] = useState<{
    shareId: string;
    expiresAt: number;
    canEdit: boolean;
    onCopy: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
  } | undefined>(undefined);

  // 显示弹窗
  const showModal = useCallback((
    type: 'alert' | 'confirm' | 'share' | 'error',
    title: string,
    message?: string
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message || '');
    setModalVisible(true);
  }, []);

  // 加载本地保存的照片（配置已在 useState 初始化时加载）
  useEffect(() => {
    const savedPhotos = getLocalPhotos();
    if (savedPhotos.length > 0) {
      setUploadedPhotos(savedPhotos);
    }
    setConfigLoaded(true);
  }, []);

  // 配置变化时保存到本地（只在初始加载完成后才保存，避免覆盖）
  useEffect(() => {
    if (configLoaded) {
      saveLocalConfig(sceneConfig as unknown as Record<string, unknown>);
    }
  }, [sceneConfig, configLoaded]);

  // 照片变化时保存到本地
  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      saveLocalPhotos(uploadedPhotos);
    }
  }, [uploadedPhotos]);

  // 分享功能
  const handleShare = useCallback(async () => {
    if (uploadedPhotos.length === 0) {
      showModal('error', '提示', '请先上传照片');
      return;
    }
    
    setIsSharing(true);
    try {
      const localShare = getLocalShare();
      
      if (localShare) {
        // 已有分享，获取详情并显示弹窗
        const shareData = await getShare(localShare.shareId);
        if (shareData) {
          const shareUrl = getShareUrl(localShare.shareId);
          setModalShareUrl(shareUrl);
          setModalShareInfo({
            shareId: localShare.shareId,
            expiresAt: shareData.expiresAt,
            canEdit: true,
            onCopy: async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                showModal('alert', '已复制', '分享链接已复制到剪贴板');
              } catch {
                // 复制失败时保持弹窗打开
              }
            },
            onRefresh: async () => {
              const result = await refreshShareExpiry(localShare.shareId, localShare.editToken);
              if (result.success) {
                showModal('alert', '续期成功', '分享有效期已延长 7 天');
              } else {
                showModal('error', '续期失败', result.error);
              }
            },
            onDelete: async () => {
              const result = await deleteShare(localShare.shareId, localShare.editToken);
              if (result.success) {
                setModalVisible(false);
                showModal('alert', '已删除', '分享已删除，您可以创建新的分享');
              } else {
                showModal('error', '删除失败', result.error);
              }
            }
          });
          showModal('share', '分享管理', '您已创建过分享，可以更新或管理');
          
          // 同时更新分享内容
          await updateShare(
            localShare.shareId,
            localShare.editToken,
            uploadedPhotos,
            sceneConfig as unknown as Record<string, unknown>,
            sceneConfig.gestureText
          );
        } else {
          // 分享已过期或不存在，清除本地记录
          clearLocalShare();
          showModal('alert', '提示', '之前的分享已过期，请重新创建');
        }
      } else {
        // 创建新分享
        const result = await uploadShare(
          uploadedPhotos,
          sceneConfig as unknown as Record<string, unknown>,
          sceneConfig.gestureText
        );
        
        if (result.success && result.shareId) {
          const shareUrl = getShareUrl(result.shareId);
          const shareData = await getShare(result.shareId);
          
          setModalShareUrl(shareUrl);
          setModalShareInfo({
            shareId: result.shareId,
            expiresAt: shareData?.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000,
            canEdit: true,
            onCopy: async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                showModal('alert', '已复制', '分享链接已复制到剪贴板');
              } catch {
                // 复制失败
              }
            },
            onRefresh: async () => {
              const localShareNow = getLocalShare();
              if (localShareNow) {
                const refreshResult = await refreshShareExpiry(localShareNow.shareId, localShareNow.editToken);
                if (refreshResult.success) {
                  showModal('alert', '续期成功', '分享有效期已延长 7 天');
                } else {
                  showModal('error', '续期失败', refreshResult.error);
                }
              }
            },
            onDelete: async () => {
              const localShareNow = getLocalShare();
              if (localShareNow) {
                const deleteResult = await deleteShare(localShareNow.shareId, localShareNow.editToken);
                if (deleteResult.success) {
                  setModalVisible(false);
                  showModal('alert', '已删除', '分享已删除');
                } else {
                  showModal('error', '删除失败', deleteResult.error);
                }
              }
            }
          });
          showModal('share', '分享成功', '您的圣诞树已分享！');
          
          // 自动复制
          try {
            await navigator.clipboard.writeText(shareUrl);
          } catch {
            // 忽略复制失败
          }
        } else {
          showModal('error', '分享失败', result.error || '请重试');
        }
      }
    } catch (err) {
      showModal('error', '分享失败', '网络错误，请重试');
      console.error(err);
    } finally {
      setIsSharing(false);
    }
  }, [uploadedPhotos, sceneConfig, showModal]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100dvh', 
      backgroundColor: '#000', 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      overflow: 'hidden', 
      touchAction: 'none',
      cursor: demoMode ? 'none' : 'auto'
    }}>
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
        src={uploadedPhotos[timeline.photoIndex] || ''}
        visible={timeline.showPhoto}
        duration={timeline.state.currentStep?.duration}
      />

      {/* 3D Canvas */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas
          key={refreshKey}
          dpr={mobile ? 1 : isTablet() ? 1.5 : [1, 2]}
          gl={{
            toneMapping: THREE.ReinhardToneMapping,
            antialias: !mobile,
            powerPreference: mobile ? 'low-power' : 'high-performance',
            logarithmicDepthBuffer: true,  // 解决 Z-fighting 问题
            precision: 'highp'
          }}
          shadows={false}
          frameloop="always"
        >
          <Experience
            sceneState={timeline.showTree ? 'FORMED' : sceneState}
            rotationSpeed={rotationSpeed}
            palmMove={palmMove}
            config={sceneConfig}
            selectedPhotoIndex={selectedPhotoIndex}
            onPhotoSelect={setSelectedPhotoIndex}
            photoPaths={uploadedPhotos}
            showHeart={showHeart}
            showText={showText}
            customMessage={(sceneConfig.gestureTexts || [sceneConfig.gestureText || 'MERRY CHRISTMAS'])[currentTextIndex] || 'MERRY CHRISTMAS'}
            hideTree={hideTree}
            heartCount={sceneConfig.gestureEffect?.heartCount || 1500}
            textCount={sceneConfig.gestureEffect?.textCount || 1000}
            heartCenterPhoto={timeline.heartPhotoIndex !== null ? uploadedPhotos[timeline.heartPhotoIndex] : undefined}
            heartCenterPhotos={uploadedPhotos.length > 0 ? uploadedPhotos : undefined}
            heartPhotoInterval={(sceneConfig.heartEffect as { photoInterval?: number } | undefined)?.photoInterval || 3000}
            onHeartPaused={setHeartPaused}
          />
        </Canvas>
      </div>

      {/* 手势控制器 */}
      <GestureController
        onGesture={handleGestureChange}
        onMove={setRotationSpeed}
        onStatus={setAiStatus}
        debugMode={debugMode}
        enabled={aiEnabled}
        isPhotoSelected={selectedPhotoIndex !== null}
        onPinch={handlePinch}
        onPalmMove={handlePalmMove}
      />

      {/* 设置面板 */}
      {!isShareMode && showSettings && (
        <SettingsPanel
          config={sceneConfig}
          onChange={setSceneConfig}
          onClose={() => setShowSettings(false)}
          aiEnabled={aiEnabled}
          onAiToggle={setAiEnabled}
          onAvatarUpload={(imageUrl) => setAvatarToCrop(imageUrl)}
          photoCount={uploadedPhotos.length}
          onTimelinePreview={() => {
            if (timeline.state.isPlaying) {
              timeline.actions.stop();
            } else {
              timeline.actions.play();
            }
          }}
          isTimelinePlaying={timeline.state.isPlaying}
        />
      )}

      {/* 头像裁剪器 */}
      {avatarToCrop && (
        <AvatarCropper
          imageUrl={avatarToCrop}
          onConfirm={(croppedImage) => {
            setSceneConfig(prev => ({ ...prev, topStar: { avatarUrl: croppedImage } }));
            setAvatarToCrop(null);
          }}
          onCancel={() => setAvatarToCrop(null)}
        />
      )}

      {/* 文件上传 */}
      {!isShareMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      )}

      {/* 底部按钮 - 演示模式下隐藏 */}
      <div style={{
        position: 'fixed',
        bottom: mobile ? 'max(20px, env(safe-area-inset-bottom))' : '30px',
        right: mobile ? '10px' : '40px',
        left: mobile ? '10px' : 'auto',
        zIndex: 100,
        display: demoMode ? 'none' : 'flex',
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

        {!isShareMode && (
          <>
            <button onClick={() => fileInputRef.current?.click()} style={buttonStyle(false, mobile)}><Camera size={18} /></button>
            <button onClick={() => setShowSettings(!showSettings)} style={buttonStyle(showSettings, mobile)}><Settings size={18} /></button>
            <button onClick={() => setDebugMode(!debugMode)} style={buttonStyle(debugMode, mobile)}>
              <Wrench size={18} />
            </button>
            <button onClick={handleShare} disabled={isSharing} style={buttonStyle(isSharing, mobile)}>
              {isSharing ? <Loader size={18} className="spin" /> : <Link size={18} />}
            </button>
            <button onClick={() => setShowTutorial(true)} style={buttonStyle(false, mobile)} title="使用帮助">
              <HelpCircle size={18} />
            </button>
            <button onClick={() => setShowPrivacy(true)} style={buttonStyle(false, mobile)} title="隐私政策">
              <Shield size={18} />
            </button>
          </>
        )}

        <button
          onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')}
          style={{ ...buttonStyle(false, mobile), padding: mobile ? '12px 24px' : '12px 30px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sceneState === 'CHAOS' ? <><TreePine size={18} /> 聚合</> : <><Sparkles size={18} /> 散开</>}
        </button>
        
        {/* 特效按钮 */}
        <button
          onClick={() => triggerEffect('heart')}
          style={{ ...buttonStyle(showHeart, mobile), display: 'flex', alignItems: 'center', gap: '4px' }}
          title="显示爱心"
        >
          <Heart size={18} />
        </button>
        <button
          onClick={() => triggerEffect('text')}
          style={{ ...buttonStyle(showText, mobile), display: 'flex', alignItems: 'center', gap: '4px' }}
          title="显示文字"
        >
          <Type size={18} />
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

      {/* AI 状态 - 演示模式下隐藏 */}
      {!demoMode && (
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
      )}

      {/* 标题 - 演示模式下保留标题 */}
      <TitleOverlay 
        text={sceneConfig.title?.text || 'Merry Christmas'} 
        enabled={(sceneConfig.title?.enabled ?? true)} 
        size={sceneConfig.title?.size || 48}
        font={sceneConfig.title?.font || 'Mountains of Christmas'}
        color={sceneConfig.title?.color || '#FFD700'}
        shadowColor={sceneConfig.title?.shadowColor}
      />
      
      {/* 演示模式提示 - 进入时短暂显示 */}
      {demoMode && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 215, 0, 0.6)',
          fontSize: '12px',
          fontFamily: 'sans-serif',
          zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          padding: '8px 16px',
          borderRadius: '20px',
          animation: 'fadeOut 3s forwards',
          pointerEvents: 'none'
        }}>
          演示模式 | 空格:聚合/散开 H:爱心 T:文字 M:音乐 1-9:选图 ←→:切换 0:取消 Esc:退出
        </div>
      )}

      {/* 歌词显示 */}
      <LyricsDisplay
        lrcUrl={getLrcUrl()}
        audioRef={audioRef}
        visible={!!getLrcUrl() && (sceneConfig.music?.showLyrics ?? true)}
      />

      {/* 自定义弹窗 */}
      <Modal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        shareUrl={modalShareUrl}
        shareInfo={modalShareInfo}
        onClose={() => setModalVisible(false)}
        buttons={modalType === 'alert' || modalType === 'error' ? [
          { text: '确定', onClick: () => setModalVisible(false), primary: true }
        ] : undefined}
      />

      {/* 首次访问教程 */}
      {showTutorial && (
        <WelcomeTutorial onClose={() => setShowTutorial(false)} gestureConfig={sceneConfig.gestures} />
      )}

      {/* 隐私政策 */}
      {showPrivacy && (
        <PrivacyNotice onClose={() => setShowPrivacy(false)} />
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
