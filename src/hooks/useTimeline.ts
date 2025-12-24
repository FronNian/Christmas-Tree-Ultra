/**
 * 时间轴播放器 Hook
 * 管理故事线模式的步骤播放逻辑
 * 注意：文字/爱心特效的显示由外部 effect 监听 currentStep 来控制
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineConfig, TimelineStep, GiftStep, VoiceStep, LetterStep } from '../types';

export interface TimelineState {
  isPlaying: boolean;
  currentStepIndex: number;
  currentStep: TimelineStep | null;
  progress: number; // 0-1 当前步骤进度
}

export interface TimelineActions {
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export interface UseTimelineReturn {
  state: TimelineState;
  actions: TimelineActions;
  // 当前应该显示的内容（仅用于 intro/photo/tree，文字和爱心由外部处理）
  showIntro: boolean;
  introText: string;
  introSubText?: string;
  showPhoto: boolean;
  photoIndex: number;
  showTree: boolean;
  // 爱心照片索引（外部 effect 使用）
  heartPhotoIndex: number | null;
  // 礼物步骤状态
  showGift: boolean;
  giftConfig: {
    message: string;
    boxColor?: string;
    ribbonColor?: string;
    messageDuration?: number;
  } | null;
  isGiftWaiting: boolean;
  isGiftOpen: boolean;
  onGiftOpen: () => void;
  onGiftMessageComplete: () => void;
  // 语音步骤状态
  showVoice: boolean;
  voiceConfig: {
    audioUrl?: string;
    audioData?: string;
    showIndicator?: boolean;
  } | null;
  onVoiceComplete: () => void;
  // 书信步骤状态
  showLetter: boolean;
  letterConfig: {
    content: string;
    speed?: number;
    fontSize?: number;
    color?: string;
  } | null;
  onLetterComplete: () => void;
}

export function useTimeline(
  config: TimelineConfig | undefined,
  totalPhotos: number,
  onComplete?: () => void,
  _configuredTexts?: string[] // 保留参数以保持 API 兼容性，但不再使用
): UseTimelineReturn {
  const [state, setState] = useState<TimelineState>({
    isPlaying: false,
    currentStepIndex: -1,
    currentStep: null,
    progress: 0
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoCounterRef = useRef(0);
  
  // 礼物步骤状态
  const [isGiftWaiting, setIsGiftWaiting] = useState(false);
  const [giftOpened, setGiftOpened] = useState(false);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  // 获取照片索引（支持自动顺序）
  const getPhotoIndex = useCallback((requestedIndex: number): number => {
    if (requestedIndex >= 0 && requestedIndex < totalPhotos) {
      return requestedIndex;
    }
    const idx = photoCounterRef.current % Math.max(1, totalPhotos);
    photoCounterRef.current++;
    return idx;
  }, [totalPhotos]);

  // 计算步骤的实际持续时间
  const getStepDuration = useCallback((step: TimelineStep): number => {
    // 爱心步骤：将「持续时间」视为【每张照片在中心预览的时间】，
    // 实际步骤总时长 ≈ 环绕(5s) + 收起(1s) + 每张照片完整轮播时间 * 张数
    if (step.type === 'heart') {
      const perPhoto = Math.max(step.duration, 500); // 每张照片至少 500ms
      const photoCount = Math.max(1, totalPhotos);

      const ORBIT_MS = 5000;  // 环绕时间
      const SHRINK_MS = 1000; // 收起时间

      const total = ORBIT_MS + SHRINK_MS + perPhoto * photoCount;

      return total;
    }
    
    // 书信步骤：根据字数自动计算持续时间
    if (step.type === 'letter') {
      const letterStep = step as LetterStep;
      const content = letterStep.content || '';
      const speed = letterStep.speed || 100;
      // 字数 * 速度 + 额外缓冲时间
      const calculatedDuration = content.length * speed + 2000;
      return Math.max(step.duration, calculatedDuration);
    }
    
    // 文字步骤：直接使用用户设置的 duration，让用户完全控制持续时间
    return step.duration;
  }, [totalPhotos]);

  // 播放指定步骤
  const playStep = useCallback((index: number) => {
    clearTimers();
    setIsGiftWaiting(false);
    setGiftOpened(false);
    
    if (!config?.steps || index < 0 || index >= config.steps.length) {
      setState({
        isPlaying: false,
        currentStepIndex: -1,
        currentStep: null,
        progress: 0
      });
      onComplete?.();
      return;
    }

    const step = config.steps[index];
    const delay = step.delay || 0;
    const actualDuration = getStepDuration(step);

    setState({
      isPlaying: true,
      currentStepIndex: index,
      currentStep: step,
      progress: 0
    });

    // 礼物步骤：等待用户点击
    if (step.type === 'gift') {
      timerRef.current = setTimeout(() => {
        setIsGiftWaiting(true);
        // 礼物步骤不自动进度，等待用户交互
      }, delay);
      return;
    }

    // 语音步骤：等待音频播放完成
    if (step.type === 'voice') {
      timerRef.current = setTimeout(() => {
        // 语音步骤不自动进度，等待 onVoiceComplete 回调
      }, delay);
      return;
    }

    // 书信步骤：等待逐字显示完成
    if (step.type === 'letter') {
      timerRef.current = setTimeout(() => {
        // 书信步骤不自动进度，等待 onLetterComplete 回调
      }, delay);
      return;
    }

    timerRef.current = setTimeout(() => {
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / actualDuration);
        setState(prev => ({ ...prev, progress }));
        
        if (progress >= 1) {
          clearTimers();
          if (step.type === 'tree') {
            if (config.loop) {
              photoCounterRef.current = 0;
              playStep(0);
            } else {
              setState(prev => ({ ...prev, isPlaying: false, progress: 1 }));
              onComplete?.();
            }
          } else {
            playStep(index + 1);
          }
        }
      }, 50);
    }, delay);
  }, [config, clearTimers, getStepDuration, onComplete]);

  const play = useCallback(() => {
    if (!config?.steps?.length) return;
    photoCounterRef.current = 0;
    playStep(0);
  }, [config, playStep]);

  const pause = useCallback(() => {
    clearTimers();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, [clearTimers]);

  const stop = useCallback(() => {
    clearTimers();
    photoCounterRef.current = 0;
    setState({
      isPlaying: false,
      currentStepIndex: -1,
      currentStep: null,
      progress: 0
    });
  }, [clearTimers]);

  const next = useCallback(() => {
    if (!config?.steps?.length) return;
    const nextIndex = Math.min(state.currentStepIndex + 1, config.steps.length - 1);
    clearTimers();
    playStep(nextIndex);
  }, [config, state.currentStepIndex, clearTimers, playStep]);

  const prev = useCallback(() => {
    if (!config?.steps?.length) return;
    const prevIndex = Math.max(state.currentStepIndex - 1, 0);
    clearTimers();
    playStep(prevIndex);
  }, [config, state.currentStepIndex, clearTimers, playStep]);

  const goTo = useCallback((index: number) => {
    clearTimers();
    playStep(index);
  }, [clearTimers, playStep]);

  // 礼物打开回调
  const onGiftOpen = useCallback(() => {
    setGiftOpened(true);
    setIsGiftWaiting(false);
  }, []);

  // 礼物消息显示完成回调
  const onGiftMessageComplete = useCallback(() => {
    // 进入下一步
    if (config?.steps && state.currentStepIndex >= 0) {
      playStep(state.currentStepIndex + 1);
    }
  }, [config, state.currentStepIndex, playStep]);

  // 语音播放完成回调
  const onVoiceComplete = useCallback(() => {
    // 进入下一步
    if (config?.steps && state.currentStepIndex >= 0) {
      playStep(state.currentStepIndex + 1);
    }
  }, [config, state.currentStepIndex, playStep]);

  // 书信显示完成回调
  const onLetterComplete = useCallback(() => {
    // 进入下一步
    if (config?.steps && state.currentStepIndex >= 0) {
      playStep(state.currentStepIndex + 1);
    }
  }, [config, state.currentStepIndex, playStep]);

  // 自动播放
  useEffect(() => {
    if (config?.enabled && config.autoPlay && config.steps?.length) {
      photoCounterRef.current = 0;
      playStep(0);
    }
    return clearTimers;
  }, [config?.enabled, config?.autoPlay]);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  // 计算当前显示状态
  const currentStep = state.currentStep;
  const isPlaying = state.isPlaying;

  const showIntro = isPlaying && currentStep?.type === 'intro';
  const introText = currentStep?.type === 'intro' ? currentStep.text : '';
  const introSubText = currentStep?.type === 'intro' ? currentStep.subText : undefined;

  const showPhoto = isPlaying && currentStep?.type === 'photo';
  const photoIndex = currentStep?.type === 'photo' 
    ? getPhotoIndex(currentStep.photoIndex) 
    : 0;

  const showTree = isPlaying && currentStep?.type === 'tree';

  const heartPhotoIndex = currentStep?.type === 'heart' && currentStep.showPhoto
    ? getPhotoIndex(currentStep.photoIndex ?? -1)
    : null;

  // 礼物步骤状态
  const showGift = isPlaying && currentStep?.type === 'gift';
  const giftConfig = currentStep?.type === 'gift' 
    ? {
        message: (currentStep as GiftStep).message,
        boxColor: (currentStep as GiftStep).boxColor,
        ribbonColor: (currentStep as GiftStep).ribbonColor,
        messageDuration: (currentStep as GiftStep).messageDuration
      }
    : null;

  // 语音步骤状态
  const showVoice = isPlaying && currentStep?.type === 'voice';
  const voiceConfig = currentStep?.type === 'voice'
    ? {
        audioUrl: (currentStep as VoiceStep).audioUrl,
        audioData: (currentStep as VoiceStep).audioData,
        showIndicator: (currentStep as VoiceStep).showIndicator
      }
    : null;

  // 书信步骤状态
  const showLetter = isPlaying && currentStep?.type === 'letter';
  const letterConfig = currentStep?.type === 'letter'
    ? {
        content: (currentStep as LetterStep).content,
        speed: (currentStep as LetterStep).speed,
        fontSize: (currentStep as LetterStep).fontSize,
        color: (currentStep as LetterStep).color
      }
    : null;

  return {
    state,
    actions: { play, pause, stop, next, prev, goTo },
    showIntro,
    introText,
    introSubText,
    showPhoto,
    photoIndex,
    showTree,
    heartPhotoIndex,
    // 礼物步骤
    showGift,
    giftConfig,
    isGiftWaiting,
    isGiftOpen: giftOpened,
    onGiftOpen,
    onGiftMessageComplete,
    // 语音步骤
    showVoice,
    voiceConfig,
    onVoiceComplete,
    // 书信步骤
    showLetter,
    letterConfig,
    onLetterComplete
  };
}
