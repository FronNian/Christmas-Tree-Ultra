// 音频分析工具 - 用于音乐波浪效果

export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  getLevel: () => number;
  dispose: () => void;
}

// 缓存已创建的 MediaElementSourceNode，避免重复创建导致音频无法播放
// 关键：createMediaElementSource 对同一个 audio 元素只能调用一次！
const audioSourceCache = new WeakMap<HTMLAudioElement, {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
}>();

/**
 * 清除音频元素的缓存（在更换音频源前调用）
 */
export function clearAudioCache(audioElement: HTMLAudioElement): void {
  const cached = audioSourceCache.get(audioElement);
  if (cached) {
    try {
      if (cached.context.state !== 'closed') {
        cached.context.close().catch(() => {});
      }
    } catch {
      // 忽略错误
    }
    audioSourceCache.delete(audioElement);
  }
}

/**
 * 创建音频分析器
 * @param audioElement HTMLAudioElement
 * @returns AudioAnalyser 对象，包含 getLevel() 方法获取当前音量等级 (0-1)
 */
export function createAudioAnalyser(audioElement: HTMLAudioElement): AudioAnalyser | null {
  try {
    let audioContext: AudioContext;
    let source: MediaElementAudioSourceNode;
    
    // 检查是否已有缓存的 source
    const cached = audioSourceCache.get(audioElement);
    if (cached && cached.context.state !== 'closed') {
      audioContext = cached.context;
      source = cached.source;
    } else {
      // 创建新的 AudioContext 和 source
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      source = audioContext.createMediaElementSource(audioElement);
      
      // 缓存起来
      audioSourceCache.set(audioElement, { context: audioContext, source });
      
      // source 必须连接到 destination 才能听到声音
      source.connect(audioContext.destination);
    }
    
    // 创建分析器节点
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    // 将 source 连接到分析器（可以多次连接到不同节点）
    source.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // 计算 RMS (Root Mean Square) 能量值
    const getLevel = (): number => {
      try {
        analyser.getByteFrequencyData(dataArray);
        
        // 计算低频段能量（0-64，约 0-8kHz）
        let sum = 0;
        const lowFreqEnd = Math.floor(bufferLength * 0.25); // 前 25% 的频率
        for (let i = 0; i < lowFreqEnd; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        
        // RMS 归一化到 0-1
        const rms = Math.sqrt(sum / lowFreqEnd) / 255;
        return Math.min(1, Math.max(0, rms));
      } catch {
        return 0;
      }
    };
    
    const dispose = () => {
      try {
        // 只断开分析器，不关闭 context 和 source（它们被缓存复用）
        analyser.disconnect();
      } catch {
        // 忽略清理错误
      }
    };
    
    return { analyser, dataArray, getLevel, dispose };
  } catch (error) {
    console.warn('Audio analyser creation failed:', error);
    return null;
  }
}

/**
 * 启动音频电平更新循环
 * @param audioAnalyser AudioAnalyser 对象
 * @param levelRef 用于存储电平值的 ref
 * @returns 停止更新的函数
 */
export function startAudioLevelUpdate(
  audioAnalyser: AudioAnalyser | null,
  levelRef: { current: number | undefined }
): () => void {
  if (!audioAnalyser) {
    levelRef.current = 0;
    return () => {};
  }
  
  let animationFrameId: number | null = null;
  let lastLevel = 0;
  const decayRate = 0.95; // 衰减系数（无音乐时缓慢衰减）
  
  const update = () => {
    if (!audioAnalyser) return;
    
    try {
      const currentLevel = audioAnalyser.getLevel();
      
      // 平滑处理：如果当前电平很低，使用衰减；否则使用当前值
      if (currentLevel < 0.01) {
        lastLevel *= decayRate;
        levelRef.current = Math.max(0, lastLevel);
      } else {
        lastLevel = currentLevel;
        levelRef.current = currentLevel;
      }
    } catch (e) {
      // 忽略读取错误
      levelRef.current = 0;
    }
    
    animationFrameId = requestAnimationFrame(update);
  };
  
  update();
  
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    levelRef.current = 0;
  };
}

