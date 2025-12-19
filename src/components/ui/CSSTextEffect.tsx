/**
 * CSS 文字特效组件
 * 用于显示中文等无法用粒子渲染的文字
 * 提供多种动画效果
 */
import React, { useEffect, useState } from 'react';
import type { TextAnimationType } from '../../types';

// CSS 动画类型（排除 particle）
type CSSAnimationType = Exclude<TextAnimationType, 'particle'>;

interface CSSTextEffectProps {
  text: string;
  visible: boolean;
  animation?: CSSAnimationType;
  color?: string;
  size?: number;
  duration?: number;
}

export const CSSTextEffect: React.FC<CSSTextEffectProps> = ({
  text,
  visible,
  animation = 'glow',
  color = '#FFD700',
  size = 48,
  duration: _duration = 3000
}) => {
  void _duration; // 保留用于未来动画扩展
  const [show, setShow] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [opacity, setOpacity] = useState(0);

  // 打字机效果
  useEffect(() => {
    if (visible && animation === 'typewriter') {
      setDisplayText('');
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < text.length) {
          setDisplayText(text.slice(0, idx + 1));
          idx++;
        } else {
          clearInterval(interval);
        }
      }, 150);
      return () => clearInterval(interval);
    } else {
      setDisplayText(text);
    }
  }, [visible, text, animation]);

  // 显示/隐藏动画
  useEffect(() => {
    if (visible) {
      setShow(true);
      requestAnimationFrame(() => setOpacity(1));
    } else {
      setOpacity(0);
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show) return null;

  // 生成动画样式
  const getAnimationStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: `${size}px`,
      fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif",
      fontWeight: 'bold',
      textAlign: 'center',
      whiteSpace: 'pre-wrap',
      lineHeight: 1.4,
    };

    switch (animation) {
      case 'glow':
        return {
          ...base,
          color: color,
          textShadow: `
            0 0 10px ${color},
            0 0 20px ${color},
            0 0 40px ${color},
            0 0 80px ${color}
          `,
          animation: 'glowPulse 2s ease-in-out infinite',
        };
      
      case 'sparkle':
        return {
          ...base,
          color: color,
          textShadow: `0 0 10px ${color}`,
          animation: 'sparkle 1.5s ease-in-out infinite',
        };
      
      case 'wave':
        return {
          ...base,
          color: color,
          textShadow: `0 0 20px ${color}`,
        };
      
      case 'bounce':
        return {
          ...base,
          color: color,
          textShadow: `0 0 15px ${color}`,
        };
      
      case 'gradient':
        return {
          ...base,
          background: `linear-gradient(90deg, ${color}, #FF69B4, #00CED1, ${color})`,
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'gradientFlow 3s linear infinite',
        };
      
      case 'neon':
        return {
          ...base,
          color: '#fff',
          textShadow: `
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px ${color},
            0 0 40px ${color},
            0 0 80px ${color},
            0 0 90px ${color},
            0 0 100px ${color},
            0 0 150px ${color}
          `,
          animation: 'neonFlicker 1.5s infinite alternate',
        };
      
      case 'typewriter':
        return {
          ...base,
          color: color,
          textShadow: `0 0 20px ${color}`,
          borderRight: `3px solid ${color}`,
          animation: 'cursorBlink 0.7s infinite',
        };
      
      default: // fadeIn
        return {
          ...base,
          color: color,
          textShadow: `0 0 30px ${color}`,
        };
    }
  };

  // 渲染波浪/弹跳效果的字符
  const renderAnimatedChars = () => {
    if (animation !== 'wave' && animation !== 'bounce') {
      return displayText;
    }

    return displayText.split('').map((char, i) => (
      <span
        key={i}
        style={{
          display: 'inline-block',
          animation: animation === 'wave' 
            ? `waveChar 1s ease-in-out infinite`
            : `bounceChar 0.6s ease infinite`,
          animationDelay: `${i * 0.1}s`,
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {/* 背景模糊 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* 文字容器 */}
      <div
        style={{
          position: 'relative',
          padding: '40px 60px',
          maxWidth: '80vw',
          ...getAnimationStyle(),
        }}
      >
        {renderAnimatedChars()}
      </div>

      {/* 装饰粒子 */}
      {animation === 'sparkle' && (
        <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '4px',
                height: '4px',
                background: color,
                borderRadius: '50%',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatParticle ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.6,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
          ))}
        </div>
      )}

      {/* CSS 动画定义 */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { 
            filter: brightness(1);
            text-shadow: 0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color};
          }
          50% { 
            filter: brightness(1.3);
            text-shadow: 0 0 20px ${color}, 0 0 40px ${color}, 0 0 80px ${color}, 0 0 120px ${color};
          }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }

        @keyframes waveChar {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes bounceChar {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }

        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }

        @keyframes neonFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            text-shadow: 
              0 0 5px #fff,
              0 0 10px #fff,
              0 0 20px ${color},
              0 0 40px ${color},
              0 0 80px ${color};
          }
          20%, 24%, 55% {
            text-shadow: none;
          }
        }

        @keyframes cursorBlink {
          0%, 100% { border-color: ${color}; }
          50% { border-color: transparent; }
        }

        @keyframes floatParticle {
          0%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-30px) scale(1.5);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default CSSTextEffect;
