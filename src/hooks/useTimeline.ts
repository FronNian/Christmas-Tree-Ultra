/**
 * 时间轴播放器 Hook
 * 管理故事线模式的步骤播放逻辑
 * 注意：文字/爱心特效的显示由外部 effect 监听 currentStep 来控制
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineConfig, TimelineStep } from '../types';

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
}

export function useTimeline(
  config: TimelineConfig | undefined,
  totalPhotos: number,
  onComplete?: () => void,
  _configuredTexts?: string[], // 保留参数以保持 API 兼容性，但不再使用
  photoInterval: number = 3000
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
    // 爱心步骤：如果显示照片，需要足够时间展示所有照片
    if (step.type === 'heart' && step.showPhoto && totalPhotos > 0) {
      const gatherTime = 2000;
      const slideTime = 600;
      const lastPhotoExtraTime = 1000;
      const calculatedDuration = gatherTime + 
        (totalPhotos * photoInterval) + 
        ((totalPhotos - 1) * slideTime) + 
        lastPhotoExtraTime;
      return Math.max(step.duration, calculatedDuration);
    }
    
    // 文字步骤：直接使用用户设置的 duration
    // 不再根据文字数量自动计算，让用户完全控制持续时间
    return step.duration;
  }, [totalPhotos, photoInterval]);

  // 播放指定步骤
  const playStep = useCallback((index: number) => {
    clearTimers();
    
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

  return {
    state,
    actions: { play, pause, stop, next, prev, goTo },
    showIntro,
    introText,
    introSubText,
    showPhoto,
    photoIndex,
    showTree,
    heartPhotoIndex
  };
}
