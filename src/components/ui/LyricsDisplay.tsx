import { useState, useEffect, useRef } from 'react';
import { isMobile } from '../../utils/helpers';

interface LyricLine {
  time: number; // 毫秒
  text: string;
}

interface LyricsDisplayProps {
  lrcUrl: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  visible: boolean;
}

// 解析 LRC 文件
function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.+)/g;
  
  let match;
  while ((match = regex.exec(lrcContent)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);
    const text = match[4].trim();
    
    // 跳过元数据行
    if (text.startsWith('Lyrics by') || text.startsWith('Composed by') || 
        text.startsWith('Produced by') || text.includes(' - ')) {
      continue;
    }
    
    const time = minutes * 60 * 1000 + seconds * 1000 + ms;
    if (text) {
      lines.push({ time, text });
    }
  }
  
  return lines.sort((a, b) => a.time - b.time);
}

export const LyricsDisplay = ({ lrcUrl, audioRef, visible }: LyricsDisplayProps) => {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [_isPlaying, setIsPlaying] = useState(false); // 保留状态以备将来使用
  const containerRef = useRef<HTMLDivElement>(null);
  const mobile = isMobile();

  // 加载 LRC 文件
  useEffect(() => {
    if (!lrcUrl) {
      setLyrics([]);
      return;
    }

    fetch(lrcUrl)
      .then(res => res.text())
      .then(content => {
        const parsed = parseLRC(content);
        setLyrics(parsed);
      })
      .catch(err => {
        console.error('Failed to load LRC:', err);
        setLyrics([]);
      });
  }, [lrcUrl]);

  // 同步歌词和播放状态
  useEffect(() => {
    if (!audioRef.current || lyrics.length === 0) return;

    const audio = audioRef.current;
    
    const updateLyric = () => {
      const currentTime = audio.currentTime * 1000;
      
      let index = -1;
      for (let i = lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= lyrics[i].time) {
          index = i;
          break;
        }
      }
      
      setCurrentIndex(index);
      setIsPlaying(!audio.paused);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateLyric);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    // 初始状态
    setIsPlaying(!audio.paused);
    
    return () => {
      audio.removeEventListener('timeupdate', updateLyric);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioRef, lyrics]);

  // 如果没有启用或没有歌词文件，不显示
  if (!visible || lyrics.length === 0) {
    return null;
  }

  // 获取当前歌词和下一句歌词
  const currentLyric = currentIndex >= 0 ? lyrics[currentIndex]?.text || '' : '';
  const nextLyric = currentIndex >= 0 && currentIndex + 1 < lyrics.length ? lyrics[currentIndex + 1]?.text || '' : '';
  
  // 只要启用了且有歌词文件，就显示组件
  // 即使 currentIndex < 0（还没到第一句歌词）或音乐暂停，也显示（会显示空内容或当前歌词）

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: mobile ? 'calc(140px + env(safe-area-inset-bottom))' : '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        textAlign: 'center',
        pointerEvents: 'none',
        maxWidth: mobile ? '90%' : '80%',
        padding: mobile ? '8px 12px' : '0',
        background: mobile ? 'rgba(0,0,0,0.5)' : 'transparent',
        borderRadius: mobile ? '8px' : '0',
      }}
    >
      {/* 当前歌词 */}
      <div
        style={{
          color: '#FFD700',
          fontSize: mobile ? '14px' : '18px',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 2px 4px rgba(0,0,0,0.8)',
          marginBottom: mobile ? '4px' : '8px',
          transition: 'opacity 0.3s',
          fontFamily: 'sans-serif',
          lineHeight: mobile ? '1.3' : '1.4',
        }}
      >
        {currentLyric}
      </div>
      
      {/* 下一句歌词 - 移动端隐藏 */}
      {!mobile && nextLyric && (
        <div
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            fontFamily: 'sans-serif',
          }}
        >
          {nextLyric}
        </div>
      )}
    </div>
  );
};
