import { useState, useEffect } from 'react';

interface IntroOverlayProps {
  text: string;
  subText?: string;
  duration?: number;
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
  // 初始状态：如果 enabled 为 true，直接进入 show 状态（跳过入场动画避免 opacity 问题）
  const [phase, setPhase] = useState<'hidden' | 'show' | 'exit'>(enabled ? 'show' : 'hidden');

  useEffect(() => {
    if (!enabled) {
      setPhase('hidden');
      return;
    }

    // enabled 变为 true 时，直接显示
    setPhase('show');

    // duration 后开始退出
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 800);
    const hideTimer = setTimeout(() => {
      setPhase('hidden');
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [enabled, duration, onComplete]);

  if (phase === 'hidden' || !text) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // 多种高度兼容方案：微信/鸿蒙/iOS/Android
        width: '100%',
        height: '100%',
        minHeight: 'calc(100vh)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: phase === 'exit' ? 'transparent' : 'rgba(0, 0, 0, 0.95)',
        transition: 'background 0.8s ease-out',
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
        overflow: 'hidden',
        boxSizing: 'border-box',
        // 安全区域内边距
        paddingTop: 'env(safe-area-inset-top, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingLeft: 'env(safe-area-inset-left, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
      onClick={() => {
        setPhase('exit');
        setTimeout(() => {
          setPhase('hidden');
          onComplete?.();
        }, 800);
      }}
    >
      {/* 内容容器 - 限制宽度防止溢出 */}
      <div
        style={{
          width: '100%',
          maxWidth: 'calc(100vw - 48px)', // 左右各留 24px
          padding: '0 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* 主文案 */}
        <h1
          style={{
            // 响应式字体：移动端更小
            fontSize: 'clamp(18px, 5vw, 48px)',
            fontWeight: 'bold',
            color: '#FFD700',
            textAlign: 'center',
            margin: 0,
            padding: 0,
            lineHeight: 1.4,
            // 强制换行防止溢出
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            hyphens: 'auto',
            maxWidth: '100%',
            width: '100%',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3)',
            opacity: phase === 'exit' ? 0 : 1,
            transform: phase === 'exit' ? 'translateY(-30px) scale(1.1)' : 'translateY(0)',
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: phase === 'show' ? 'introTextGlow 2s ease-in-out infinite' : 'none',
          }}
        >
          {text}
        </h1>

        {/* 副文案 */}
        {subText && (
          <p
            style={{
              fontSize: 'clamp(12px, 3vw, 18px)',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              margin: '16px 0 0 0',
              padding: 0,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              hyphens: 'auto',
              maxWidth: '100%',
              width: '100%',
              opacity: phase === 'exit' ? 0 : 1,
              transform: 'translateY(0)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
            }}
          >
            {subText}
          </p>
        )}
      </div>

      {/* 点击提示 */}
      <p
        style={{
          position: 'absolute',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.4)',
          opacity: phase === 'show' ? 1 : 0,
          transition: 'opacity 0.5s',
          animation: phase === 'show' ? 'introPulse 2s ease-in-out infinite' : 'none',
          whiteSpace: 'nowrap',
          padding: '0 16px',
        }}
      >
        点击任意位置继续
      </p>

      <style>{`
        @keyframes introTextGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.5), 0 0 40px rgba(255, 215, 0, 0.3);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.5), 0 0 80px rgba(255, 215, 0, 0.3);
          }
        }
        @keyframes introPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};
