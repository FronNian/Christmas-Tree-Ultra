/**
 * 时间轴播放器 Hook
 * 管理故事线模式的播放逻辑
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimelineConfig, TimelineStep, TextAnimationType } from '../types';

export interface TimelineState {
  isPlaying: boolean;
  currentStepIndex: number;
  currentStep: TimelineStep | null;
  progress: number; // 0-1 当前步骤进度
  photoDisplayIndex: number; // 当前应该显示的照片索引（用于按顺序显示）
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
  // 当前应该显示的内容
  showIntro: boolean;
  introText: string;
  introSubText?: string;
  showPhoto: boolean;
  photoIndex: number;
  showHeart: boolean;
  heartPhotoIndex: number | null; // 爱心中心的照片
  showText: boolean;
  textContent: string;
  textAnimation?: TextAnimationType; // 文字动画类型
  useConfiguredText?: boolean; // 是否使用已配置文字
  showTree: boolean;
}

export function useTimeline(
  config: TimelineConfig | undefined,
  totalPhotos: number,
  onComplete?: () => void,
  configuredTexts?: string[]
): UseTimelineReturn {
  const [state, setState] = useState<TimelineState>({
    isPlaying: false,
    currentStepIndex: -1,
    currentStep: null,
    progress: 0,
    photoDisplayIndex: 0
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoCounterRef = useRef(0); // 用于按顺序显示照片

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
    // -1 表示按顺序自动选择
    const idx = photoCounterRef.current % Math.max(1, totalPhotos);
    photoCounterRef.current++;
    return idx;
  }, [totalPhotos]);

  // 播放指定步骤
  const playStep = useCallback((index: number) => {
    // 预览时不检查 enabled，只检查步骤有效性
    if (!config?.steps || index < 0 || index >= config.steps.length) {
      // 播放结束
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentStepIndex: -1,
        currentStep: null,
        progress: 0
      }));
      onComplete?.();
      return;
    }

    const step = config.steps[index];
    const delay = step.delay || 0;

    // 设置当前步骤
    setState(prev => ({
      ...prev,
      isPlaying: true,
      currentStepIndex: index,
      currentStep: step,
      progress: 0,
      photoDisplayIndex: step.type === 'photo' 
        ? getPhotoIndex((step as { photoIndex: number }).photoIndex)
        : prev.photoDisplayIndex
    }));

    // 延迟后开始
    timerRef.current = setTimeout(() => {
      // 进度更新
      const startTime = Date.now();
      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / step.duration);
        setState(prev => ({ ...prev, progress }));
        
        if (progress >= 1) {
          clearTimers();
          // 自动播放下一步
          if (step.type === 'tree') {
            // 圣诞树是结束标志
            if (config.loop) {
              photoCounterRef.current = 0;
              playStep(0);
            } else {
              setState(prev => ({
                ...prev,
                isPlaying: false,
                progress: 1
              }));
              onComplete?.();
            }
          } else {
            playStep(index + 1);
          }
        }
      }, 50);
    }, delay);
  }, [config, clearTimers, getPhotoIndex, onComplete]);

  // 播放控制
  const play = useCallback(() => {
    // 预览时不检查 enabled，只检查是否有步骤
    if (!config?.steps?.length) return;
    
    // 总是从头开始播放
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
      progress: 0,
      photoDisplayIndex: 0
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

  // 清理
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

  const showHeart = isPlaying && currentStep?.type === 'heart';
  const heartPhotoIndex = currentStep?.type === 'heart' && currentStep.showPhoto
    ? getPhotoIndex(currentStep.photoIndex ?? -1)
    : null;

  const showText = isPlaying && currentStep?.type === 'text';
  // 如果使用已配置文字，则使用 configuredTexts，否则使用步骤中的 text
  const textContent = currentStep?.type === 'text' 
    ? (currentStep.useConfiguredText && configuredTexts?.length 
        ? configuredTexts[0]  // 使用第一条配置文字
        : currentStep.text)
    : '';
  const textAnimation = currentStep?.type === 'text' ? currentStep.animation : undefined;
  const useConfiguredText = currentStep?.type === 'text' ? currentStep.useConfiguredText : false;

  const showTree = isPlaying && currentStep?.type === 'tree';

  return {
    state,
    actions: { play, pause, stop, next, prev, goTo },
    showIntro,
    introText,
    introSubText,
    showPhoto,
    photoIndex,
    showHeart,
    heartPhotoIndex,
    showText,
    textContent,
    textAnimation,
    useConfiguredText,
    showTree
  };
}
