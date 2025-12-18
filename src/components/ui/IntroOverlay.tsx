import { useState, useEffect } from 'react';

interface IntroOverlayProps {
  text: string;
  subText?: string;
  duration?: number; // 显示时长（毫秒）
  onComplete?: () => void;
  enabled?: boolean;
}

export const IntroOverlay = ({ 
  text, 
  subText,
  duration = 4000, 
  onComplete,
  enabled = true
}: IntroOverlayProps) => {
  const [visible, setVisible] = useState(enabled);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setPhase('enter');

    // 进入动画完成后进入显示阶段
    const enterTimer = setTimeout(() => setPhase('show'), 800);
    
    // 显示一段时间后开始退出
    const showTimer = setTimeout(() => setPhase('exit'), duration - 800);
    
    // 退出动画完成后隐藏
    const exitTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
    };
  }, [enabled, duration, onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: phase === 'exit' ? 'transparent' : 'rgba(0, 0, 0, 0.95)',
        transition: 'background 0.8s ease-out',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
      onClick={() => {
        setPhase('exit');
        setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 800);
      }}
    >
      {/* 主文案 */}
      <h1
        style={{
          fontSize: 'clamp(24px, 8vw, 64px)',
          fontWeight: 'bold',
          color: '#FFD700',
          textAlign: 'center',
          margin: 0,
          padding: '0 20px',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
          opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(30px)' : phase === 'exit' ? 'translateY(-30px) scale(1.1)' : 'translateY(0)',
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          animation: phase === 'show' ? 'textGlow 2s ease-in-out infinite' : 'none',
        }}
      >
        {text}
      </h1>

      {/* 副文案 */}
      {subText && (
        <p
          style={{
            fontSize: 'clamp(14px, 4vw, 24px)',
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            margin: '20px 0 0 0',
            padding: '0 20px',
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(20px)' : 'translateY(0)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
          }}
        >
          {subText}
        </p>
      )}

      {/* 点击提示 */}
      <p
        style={{
          position: 'absolute',
          bottom: '40px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.4)',
          opacity: phase === 'show' ? 1 : 0,
          transition: 'opacity 0.5s',
          animation: phase === 'show' ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        点击任意位置继续
      </p>

      {/* CSS 动画 */}
      <style>{`
        @keyframes textGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5), 0 0 80px rgba(255, 215, 0, 0.3);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
