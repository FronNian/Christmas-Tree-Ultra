// 音频分析工具 - 用于音乐波浪效果

export interface AudioAnalyser {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  getLevel: () => number;
  dispose: () => void;
}

/**
 * 创建音频分析器
 * @param audioElement HTMLAudioElement
 * @returns AudioAnalyser 对象，包含 getLevel() 方法获取当前音量等级 (0-1)
 */
export function createAudioAnalyser(audioElement: HTMLAudioElement): AudioAnalyser | null {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // 计算 RMS (Root Mean Square) 能量值
    const getLevel = (): number => {
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
    };
    
    const dispose = () => {
      try {
        source.disconnect();
        analyser.disconnect();
        if (audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
      } catch (e) {
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

