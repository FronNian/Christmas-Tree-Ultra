import { isMobile } from '../../utils/helpers';

// 可用的艺术字体（含中文）
export const TITLE_FONTS = [
  // 中文艺术字体
  { value: 'ZCOOL XiaoWei', label: '🏮 站酷小薇（中文）', style: 'chinese', chinese: true },
  { value: 'ZCOOL QingKe HuangYou', label: '🎨 站酷庆科黄油（中文）', style: 'chinese', chinese: true },
  { value: 'Ma Shan Zheng', label: '✍️ 马善政楷书（中文）', style: 'chinese', chinese: true },
  { value: 'Zhi Mang Xing', label: '🌙 志莽行书（中文）', style: 'chinese', chinese: true },
  { value: 'Liu Jian Mao Cao', label: '🖌️ 刘建毛草（中文）', style: 'chinese', chinese: true },
  { value: 'Long Cang', label: '📜 龙藏体（中文）', style: 'chinese', chinese: true },
  { value: 'ZCOOL KuaiLe', label: '😊 站酷快乐（中文）', style: 'chinese', chinese: true },
  { value: 'Noto Serif SC', label: '📖 思源宋体（中文）', style: 'chinese', chinese: true },
  { value: 'Noto Sans SC', label: '🔤 思源黑体（中文）', style: 'chinese', chinese: true },
  // 英文艺术字体
  { value: 'Mountains of Christmas', label: '🎄 Mountains of Christmas', style: 'christmas', chinese: false },
  { value: 'Great Vibes', label: '✨ Great Vibes', style: 'elegant', chinese: false },
  { value: 'Dancing Script', label: '💃 Dancing Script', style: 'playful', chinese: false },
  { value: 'Pacifico', label: '🌊 Pacifico', style: 'casual', chinese: false },
  { value: 'Lobster', label: '🦞 Lobster', style: 'bold', chinese: false },
  { value: 'Satisfy', label: '💫 Satisfy', style: 'smooth', chinese: false },
  { value: 'Tangerine', label: '🍊 Tangerine', style: 'thin', chinese: false },
  { value: 'Allura', label: '🌸 Allura', style: 'romantic', chinese: false },
  { value: 'Alex Brush', label: '🖌️ Alex Brush', style: 'brush', chinese: false },
  { value: 'Pinyon Script', label: '🪶 Pinyon Script', style: 'classic', chinese: false },
  { value: 'Sacramento', label: '🌟 Sacramento', style: 'handwritten', chinese: false }
];

interface TitleOverlayProps {
  text: string;
  enabled: boolean;
  size?: number;
  font?: string;
  color?: string;
  shadowColor?: string;
}

export const TitleOverlay = ({ 
  text, 
  enabled, 
  size = 48, 
  font = 'Mountains of Christmas',
  color = '#FFD700',
  shadowColor
}: TitleOverlayProps) => {
  // 如果没有指定阴影颜色，使用主颜色的半透明版本
  const glowColor = shadowColor || color;
  const mobile = isMobile();
  const fontSize = mobile ? Math.max(size * 0.6, 20) : size;

  if (!enabled) return null;

  return (
    <div style={{
      position: 'absolute',
      top: mobile ? '50px' : '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 15,
      textAlign: 'center',
      pointerEvents: 'none'
    }}>
      <h1 style={{
        fontFamily: `'${font.replace(/['"<>]/g, '')}', cursive`,
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        color: color,
        textShadow: `0 0 10px ${glowColor}cc, 0 0 20px ${glowColor}99, 0 0 30px ${glowColor}66, 2px 2px 4px rgba(0,0,0,0.5)`,
        margin: 0,
        letterSpacing: '2px',
        animation: 'titleGlow 2s ease-in-out infinite alternate',
        whiteSpace: 'nowrap'
      }}>
        {/* 文本内容由 React 自动转义，防止 XSS */}
        {(text || 'Merry Christmas').slice(0, 100)}
      </h1>
      <style>{`
        @keyframes titleGlow {
          from { text-shadow: 0 0 10px ${glowColor}cc, 0 0 20px ${glowColor}99, 0 0 30px ${glowColor}66, 2px 2px 4px rgba(0,0,0,0.5); }
          to { text-shadow: 0 0 15px ${glowColor}, 0 0 30px ${glowColor}cc, 0 0 45px ${glowColor}99, 2px 2px 4px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
};
