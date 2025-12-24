/**
 * 书信步骤显示组件
 * 3D 信封打开动画 + 逐字显示效果
 */
import React, { useState, useEffect, useRef } from 'react';
import { isMobile } from '../../utils/helpers';

interface LetterStepOverlayProps {
  visible: boolean;
  content: string;
  speed?: number;        // 打字速度（毫秒/字），默认 100
  fontSize?: number;     // 字体大小，默认 24
  color?: string;       // 文字颜色，默认 '#FFD700'
  onComplete?: () => void;
}

type Phase = 'hidden' | 'envelope' | 'opening' | 'letter' | 'typing' | 'complete';

export const LetterStepOverlay: React.FC<LetterStepOverlayProps> = ({
  visible,
  content,
  speed = 100,
  fontSize = 24,
  color = '#FFD700',
  onComplete
}) => {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [displayedText, setDisplayedText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const mobile = isMobile();

  // 清理定时器
  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!visible) {
      setPhase('hidden');
      setDisplayedText('');
      indexRef.current = 0;
      clearTimers();
      return;
    }

    // 显示信封，等待用户点击
    setPhase('envelope');

    return clearTimers;
  }, [visible]);

  // 用户点击信封后开始打开动画
  const handleEnvelopeClick = () => {
    if (phase !== 'envelope') return;
    
    setPhase('opening');
    
    // 信封打开动画完成 -> 显示信纸
    timerRef.current = setTimeout(() => {
      setPhase('letter');
      
      // 信纸展开完成 -> 开始打字
      timerRef.current = setTimeout(() => {
        setPhase('typing');
        indexRef.current = 0;
        setDisplayedText('');
        
        // 开始逐字显示
        const typeNextChar = () => {
          if (indexRef.current < content.length) {
            setDisplayedText(content.slice(0, indexRef.current + 1));
            indexRef.current++;
            timerRef.current = setTimeout(typeNextChar, speed);
          } else {
            setPhase('complete');
            // 完成后延迟回调
            timerRef.current = setTimeout(() => {
              onComplete?.();
            }, 1500);
          }
        };
        
        timerRef.current = setTimeout(typeNextChar, 300);
      }, 800);
    }, 1200);
  };

  if (phase === 'hidden') return null;

  // 响应式尺寸
  const envelopeWidth = mobile ? 280 : 400;
  const envelopeHeight = mobile ? 180 : 260;
  const paperWidth = mobile ? '92vw' : 'min(85vw, 750px)';
  const paperMinHeight = mobile ? '65vh' : '75vh';
  const paperPadding = mobile ? '28px 24px' : '60px 70px';
  const actualFontSize = mobile ? Math.max(18, fontSize * 0.85) : fontSize;

  const isEnvelopePhase = phase === 'envelope' || phase === 'opening';
  const isLetterPhase = phase === 'letter' || phase === 'typing' || phase === 'complete';

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
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(15px)',
        padding: mobile ? '20px 10px' : '40px 20px',
        boxSizing: 'border-box',
        perspective: '1500px'
      }}
    >
      {/* 3D 信封 */}
      {isEnvelopePhase && (
        <div
          onClick={handleEnvelopeClick}
          style={{
            position: 'relative',
            width: envelopeWidth,
            height: envelopeHeight,
            transformStyle: 'preserve-3d',
            animation: phase === 'envelope' ? 'envelopeFloat 2s ease-in-out infinite' : 'none',
            transform: phase === 'opening' ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.5s ease',
            cursor: phase === 'envelope' ? 'pointer' : 'default'
          }}
        >
          {/* 信封背面（底层） */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, #6a4a2a 0%, #5a3a1a 100%)`,
              borderRadius: '8px',
              boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5)`
            }}
          />

          {/* 信封主体（正面） */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '75%',
              bottom: 0,
              background: `linear-gradient(180deg, #8B4513 0%, #654321 50%, #4a3728 100%)`,
              borderRadius: '0 0 8px 8px',
              boxShadow: `
                0 0 40px ${color}20,
                inset 0 5px 20px rgba(0, 0, 0, 0.2)
              `,
              border: `2px solid ${color}40`,
              borderTop: 'none',
              zIndex: 2
            }}
          >
            {/* 信封纹理框 */}
            <div
              style={{
                position: 'absolute',
                top: '30%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '45%',
                border: `2px solid ${color}25`,
                borderRadius: '4px'
              }}
            />
          </div>

          {/* 蜡封 - 在盖子和主体交界处 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: mobile ? 50 : 65,
              height: mobile ? 50 : 65,
              background: `radial-gradient(circle at 30% 30%, #dc143c, #8b0000)`,
              borderRadius: '50%',
              boxShadow: `
                0 4px 15px rgba(0, 0, 0, 0.5),
                inset 0 2px 10px rgba(255, 255, 255, 0.2)
              `,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: mobile ? '18px' : '24px',
              zIndex: phase === 'opening' ? 1 : 10,
              opacity: phase === 'opening' ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
          >
            ❤️
          </div>

          {/* 信封盖子 - 三角尖在下，从底边(上方)向上翻开 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '55%',
              transformStyle: 'preserve-3d',
              transformOrigin: 'top center',
              transform: phase === 'opening' ? 'rotateX(-180deg)' : 'rotateX(0deg)',
              transition: 'transform 1s ease-in-out',
              zIndex: phase === 'opening' ? 0 : 3
            }}
          >
            {/* 盖子正面 - 三角形：左上、右上、中下 */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: `linear-gradient(180deg, #9a5c2e 0%, #7a4a24 100%)`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                backfaceVisibility: 'hidden'
              }}
            />
            {/* 盖子背面（翻开后看到的内侧） */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: `linear-gradient(180deg, #4a2808 0%, #5a3010 100%)`,
                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)'
              }}
            />
          </div>

          {/* 提示文字 */}
          {phase === 'envelope' && (
            <div
              style={{
                position: 'absolute',
                bottom: -70,
                left: '50%',
                transform: 'translateX(-50%)',
                color: color,
                fontSize: mobile ? '14px' : '16px',
                opacity: 0.9,
                whiteSpace: 'nowrap',
                animation: 'pulse 2s ease-in-out infinite',
                textAlign: 'center'
              }}
            >
              <div>✨ 有一封信给你 ✨</div>
              <div style={{ marginTop: '8px', fontSize: mobile ? '12px' : '14px', opacity: 0.7 }}>
                点击拆开
              </div>
            </div>
          )}
        </div>
      )}

      {/* 信纸内容 */}
      {isLetterPhase && (
        <div
          style={{
            width: paperWidth,
            minHeight: paperMinHeight,
            maxHeight: '88vh',
            background: `linear-gradient(180deg, 
              rgba(30, 25, 20, 0.98) 0%, 
              rgba(20, 18, 15, 0.98) 50%,
              rgba(15, 12, 10, 0.98) 100%
            )`,
            border: `2px solid ${color}40`,
            borderRadius: mobile ? '12px' : '24px',
            padding: paperPadding,
            boxShadow: `
              0 0 80px ${color}15,
              0 30px 100px rgba(0, 0, 0, 0.6),
              inset 0 0 100px rgba(0, 0, 0, 0.2)
            `,
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            animation: 'letterUnfold 0.8s ease-out',
            transformOrigin: 'top center'
          }}
        >
          {/* 信纸装饰边框 */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              bottom: 10,
              border: `1px solid ${color}15`,
              borderRadius: mobile ? '8px' : '18px',
              pointerEvents: 'none'
            }}
          />

          {/* 书信样式背景 - 横线 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                repeating-linear-gradient(
                  transparent,
                  transparent ${actualFontSize * 1.8 - 1}px,
                  rgba(255, 215, 0, 0.06) ${actualFontSize * 1.8 - 1}px,
                  rgba(255, 215, 0, 0.06) ${actualFontSize * 1.8}px
                )
              `,
              backgroundPosition: `0 ${mobile ? 28 : 60}px`,
              pointerEvents: 'none',
              borderRadius: mobile ? '12px' : '24px'
            }}
          />

          {/* 文字内容 */}
          <div
            style={{
              position: 'relative',
              color: color,
              fontSize: `${actualFontSize}px`,
              lineHeight: '1.8',
              fontFamily: '"KaiTi", "楷体", "STKaiti", "华文楷体", "Noto Serif SC", serif',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textShadow: `0 0 20px ${color}25`,
              flex: 1,
              letterSpacing: '0.06em',
              opacity: phase === 'letter' ? 0 : 1,
              transition: 'opacity 0.5s ease'
            }}
          >
            {displayedText}
            {/* 光标闪烁效果 */}
            {phase === 'typing' && (
              <span
                style={{
                  display: 'inline-block',
                  width: '2px',
                  height: `${actualFontSize * 1.2}px`,
                  background: color,
                  marginLeft: '4px',
                  animation: 'letterBlink 0.8s infinite',
                  verticalAlign: 'middle',
                  boxShadow: `0 0 10px ${color}`
                }}
              />
            )}
          </div>

          {/* 完成装饰 */}
          {phase === 'complete' && (
            <div
              style={{
                marginTop: '40px',
                textAlign: 'right',
                paddingRight: '30px',
                animation: 'fadeIn 0.5s ease'
              }}
            >
              <span
                style={{
                  color: `${color}60`,
                  fontSize: mobile ? '24px' : '32px',
                  filter: `drop-shadow(0 0 10px ${color}40)`
                }}
              >
                ✉️
              </span>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes letterBlink {
            0%, 45% { opacity: 1; }
            50%, 100% { opacity: 0; }
          }
          
          @keyframes envelopeFloat {
            0%, 100% { transform: translateY(0) rotateY(0deg); }
            50% { transform: translateY(-10px) rotateY(5deg); }
          }
          
          @keyframes letterUnfold {
            0% { 
              opacity: 0;
              transform: scaleY(0.3) translateY(-50px);
            }
            100% { 
              opacity: 1;
              transform: scaleY(1) translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};
