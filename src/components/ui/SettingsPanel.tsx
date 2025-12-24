
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { SceneConfig, GestureConfig, GestureAction, MusicConfig, AnimationEasing, ScatterShape, GatherShape, DecorationColors, DecorationStyle, DecorationMaterial } from '../../types';
import { PRESET_MUSIC } from '../../types';
import { isMobile, getDefaultSceneConfig } from '../../utils/helpers';
import { THEME_PRESETS, type ThemeKey } from '../../config/themes';
import { TITLE_FONTS } from './TitleOverlay';
import { TimelineEditor } from './TimelineEditor';
import { VisualEnhancementsSettings } from './VisualEnhancementsSettings';
import { DECORATION_STYLE_NAMES, DECORATION_STYLE_DESCRIPTIONS, DECORATION_MATERIAL_NAMES } from '../three/DecorationGeometries';
import { 
  TreePine, Sparkles, Heart, Type, X, Settings,
  TreeDeciduous, Lightbulb, Gift, Ribbon, Snowflake, CloudFog, Star, Rainbow, Bot, Hand, Music, Upload, Zap, Palette,
  ChevronDown, ChevronRight, Film, Image, Gem
} from 'lucide-react';

// 可折叠分组组件
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div style={{
      marginBottom: '12px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      paddingBottom: isOpen ? '12px' : '0'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          padding: '8px 0',
          cursor: 'pointer',
          color: '#FFD700',
          fontSize: '13px',
          fontWeight: 'bold'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon}
          {title}
        </span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && (
        <div style={{ paddingTop: '8px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// 预设颜色列表（精简为16色，5x3+1布局更紧凑）
const PRESET_COLORS = [
  '#FF0000', '#FF4500', '#FF1493', '#FFD700', '#FFA500',
  '#00FF00', '#00FF88', '#2E7D32', '#00FFFF', '#1E90FF',
  '#0000FF', '#9C27B0', '#8B00FF', '#FFFFFF', '#9E9E9E',
  '#000000',
];

// 移动端友好的颜色选择器组件（使用预设颜色 + 手动输入）
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  style?: React.CSSProperties;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  
  // 同步外部值变化
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // 计算弹出层位置
  const calculatePosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = 160; // 弹出层固定宽度
    const ph = 240; // 预估高度
    
    // 水平：优先左对齐按钮，超出则右对齐屏幕
    let left = rect.left;
    if (left + pw > vw - 10) {
      left = vw - pw - 10;
    }
    if (left < 10) left = 10;
    
    // 垂直：优先向下，不够则向上
    let top = rect.bottom + 4;
    if (top + ph > vh - 10) {
      top = rect.top - ph - 4;
    }
    if (top < 10) top = 10;
    
    setPopupPosition({ top, left });
  }, []);
  
  // 打开时计算位置
  React.useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);
  
  const handleInputChange = (v: string) => {
    setInputValue(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      onChange(v);
    }
  };
  
  const handleColorSelect = (color: string) => {
    onChange(color);
    setInputValue(color);
  };
  
  // 点击外部关闭
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsidePopup = popupRef.current && !popupRef.current.contains(target);
      
      if (isOutsideButton && isOutsidePopup) {
        setIsOpen(false);
      }
    };
    
    // 延迟添加监听，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [isOpen]);
  
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
  
  return (
    <div style={{ position: 'relative', ...style }}>
      {/* 颜色预览按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: style?.height || '32px',
          minHeight: '32px',
          cursor: 'pointer',
          borderRadius: '4px',
          border: '2px solid rgba(255,255,255,0.3)',
          background: value,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span style={{
          fontSize: '9px',
          color: '#fff',
          textShadow: '0 0 3px #000, 0 0 3px #000',
          fontWeight: 'bold'
        }}>
          {isOpen ? '关闭' : '选色'}
        </span>
      </button>
      
      {/* 颜色选择器弹出层 - 使用 Portal 渲染到 body */}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            width: '160px',
            maxHeight: `${Math.min(260, viewportHeight - 20)}px`,
            overflowY: 'auto',
            zIndex: 10000,
            padding: '8px',
            background: 'rgba(20, 20, 20, 0.98)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,215,0,0.3)',
          }}
          onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {/* 预设颜色网格 4x4 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '8px'
          }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: color,
                  border: value === color ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: 0,
                  minHeight: '28px',
                  boxShadow: value === color ? '0 0 6px rgba(255,215,0,0.5)' : 'none'
                }}
              />
            ))}
          </div>
          
          {/* 手动输入 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              background: value,
              border: '2px solid rgba(255,255,255,0.3)',
              flexShrink: 0
            }} />
            <input
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value.toUpperCase())}
              placeholder="#FFFFFF"
              style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                width: '80%'
              }}
            />
          </div>
          
          {/* 确定按钮 */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#FFD700',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            确定
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

// 默认装饰颜色
const DEFAULT_DECORATION_COLORS: DecorationColors = {
  primary: '#D32F2F',
  secondary: '#FFD700',
  accent: '#1976D2',
  candy1: '#FF0000',
  candy2: '#FFFFFF'
};

// 预设颜色方案
const COLOR_PRESETS = [
  { name: '经典圣诞', colors: { primary: '#D32F2F', secondary: '#FFD700', accent: '#2E7D32', candy1: '#FF0000', candy2: '#FFFFFF' } },
  { name: '冰雪蓝', colors: { primary: '#1976D2', secondary: '#90CAF9', accent: '#E3F2FD', candy1: '#2196F3', candy2: '#FFFFFF' } },
  { name: '粉色梦幻', colors: { primary: '#E91E63', secondary: '#F8BBD9', accent: '#FCE4EC', candy1: '#FF4081', candy2: '#FFFFFF' } },
  { name: '金色奢华', colors: { primary: '#FFD700', secondary: '#FFA000', accent: '#FFECB3', candy1: '#FF8F00', candy2: '#FFF8E1' } },
  { name: '紫色神秘', colors: { primary: '#9C27B0', secondary: '#E1BEE7', accent: '#7B1FA2', candy1: '#AB47BC', candy2: '#F3E5F5' } },
];

// 装饰样式对应的类型名称
const STYLE_TYPE_NAMES: Record<DecorationStyle, [string, string, string]> = {
  classic: ['📦 方块', '🔴 球体', '🍬 糖果棒'],
  crystal: ['💎 八面体', '🔷 菱形', '🔮 棱柱'],
  gem: ['💍 钻石', '💚 祖母绿', '❤️ 心形'],
  nature: ['🌰 松果', '❄️ 雪花', '🧊 冰晶'],
  modern: ['⭐ 星形', '🔶 多面体', '⭕ 环形']
};

// 动画缓动选项
const animationEasingOptions: { value: AnimationEasing; label: string; desc: string }[] = [
  { value: 'linear', label: '线性', desc: '匀速运动' },
  { value: 'easeIn', label: '渐入', desc: '先慢后快' },
  { value: 'easeOut', label: '渐出', desc: '先快后慢' },
  { value: 'easeInOut', label: '渐入渐出', desc: '两头慢中间快' },
  { value: 'bounce', label: '弹跳', desc: '到达时弹跳' },
  { value: 'elastic', label: '弹性', desc: '弹性回弹效果' },
];

// 散开形状选项
const scatterShapeOptions: { value: ScatterShape; label: string; desc: string }[] = [
  { value: 'sphere', label: '球形', desc: '随机球形分布' },
  { value: 'explosion', label: '爆炸', desc: '从中心向外辐射' },
  { value: 'spiral', label: '螺旋', desc: '螺旋上升分布' },
  { value: 'rain', label: '雨滴', desc: '从上方飘落' },
  { value: 'ring', label: '环形', desc: '环绕分布' },
];

// 聚合形状选项
const gatherShapeOptions: { value: GatherShape; label: string; desc: string }[] = [
  { value: 'direct', label: '直接', desc: '同时聚合' },
  { value: 'stack', label: '搭积木', desc: '从下往上堆叠' },
  { value: 'spiralIn', label: '螺旋', desc: '螺旋旋转聚合' },
  { value: 'implode', label: '向心', desc: '从外向内收缩' },
  { value: 'waterfall', label: '瀑布', desc: '从上往下落' },
  { value: 'wave', label: '波浪', desc: '波浪式扫过' },
];

// 手势动作选项
const gestureActionOptions: { value: GestureAction; label: string }[] = [
  { value: 'none', label: '无动作' },
  { value: 'formed', label: '✊ 聚合' },
  { value: 'chaos', label: '🖐️ 散开' },
  { value: 'heart', label: '❤️ 爱心' },
  { value: 'text', label: '✨ 文字' },
  { value: 'music', label: '🎵 音乐' },
  { value: 'screenshot', label: '📸 截图' },
  { value: 'reset', label: '🔄 重置' },
  { value: 'zoomIn', label: '🔍 放大' },
  { value: 'zoomOut', label: '🔎 缩小' },
  { value: 'themeClassic', label: '🎄 主题：经典' },
  { value: 'themeIcy', label: '❄️ 主题：冰蓝' },
  { value: 'themeCandy', label: '🍭 主题：糖果' }
];

// 手势名称映射
const gestureNames: Record<keyof GestureConfig, string> = {
  Closed_Fist: '✊ 握拳',
  Open_Palm: '🖐️ 张开手掌 (移动控制视角)',
  Pointing_Up: '☝️ 食指向上',
  Thumb_Down: '👎 拇指向下',
  Thumb_Up: '👍 拇指向上',
  Victory: '✌️ 剪刀手',
  ILoveYou: '🤟 我爱你',
  Pinch: '🤏 捏合 (选择照片)'
};

interface SettingsPanelProps {
  config: SceneConfig;
  onChange: (config: SceneConfig) => void;
  onClose: () => void;
  aiEnabled: boolean;
  onAiToggle: (enabled: boolean) => void;
  onAvatarUpload?: (imageUrl: string) => void;  // 头像上传回调
  photoCount?: number;  // 照片数量（用于时间轴编辑器）
  photoPaths?: string[];  // 照片URL数组（用于预览）
  onTimelinePreview?: () => void;  // 时间轴预览回调
  isTimelinePlaying?: boolean;  // 时间轴是否正在播放
}

export const SettingsPanel = ({ 
  config, onChange, onClose, aiEnabled, onAiToggle, onAvatarUpload,
  photoCount = 0, photoPaths = [], onTimelinePreview, isTimelinePlaying = false
}: SettingsPanelProps) => {
  const mobile = isMobile();

  const defaultGestures: GestureConfig = {
    Closed_Fist: 'formed',
    Open_Palm: 'chaos',
    Pointing_Up: 'music',
    Thumb_Down: 'zoomOut',
    Thumb_Up: 'zoomIn',
    Victory: 'text',
    ILoveYou: 'heart',
    Pinch: 'none'  // 捏合固定用于选择照片，不可配置
  };

  const defaultMusic: MusicConfig = {
    selected: 'christmas-stars',
    volume: 0.5
  };

  const safeConfig = {
    ...config,
    title: config.title || { enabled: true, text: 'Merry Christmas', size: 48 },
    giftPile: config.giftPile || { enabled: true, count: 18 },
    ribbons: config.ribbons || { enabled: true, count: 50 },
    fog: config.fog || { enabled: true, opacity: 0.3 },
    gestures: config.gestures || defaultGestures,
    music: config.music || defaultMusic,
    cameraSensitivity: config.cameraSensitivity || 25
  };

  // 主题合并（深度合并，不影响照片/时间轴等数据）
  const mergeConfig = (target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...target };
    Object.keys(patch).forEach((key) => {
      const src = patch[key];
      const dst = (target as Record<string, unknown>)[key];
      if (src && typeof src === 'object' && !Array.isArray(src)) {
        result[key] = mergeConfig((dst as Record<string, unknown>) || {}, src as Record<string, unknown>);
      } else {
        result[key] = src;
      }
    });
    return result;
  };

  const applyThemePreset = (theme: ThemeKey) => {
    const preset = THEME_PRESETS[theme];
    if (!preset) return;
    onChange(mergeConfig(config as unknown as Record<string, unknown>, { ...preset, themeLabel: theme } as Record<string, unknown>) as unknown as SceneConfig);
  };

  // 检测是否为平板（宽度 >= 768px 且 <= 1024px）
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth <= 1024;
  // 移动端使用全屏模式，平板和桌面使用侧边栏模式
  const useFullScreen = mobile && !isTablet;

  // 微信/鸿蒙/iOS/Android 浏览器兼容样式
  const panelStyle: React.CSSProperties = useFullScreen ? {
    // 移动端：全屏覆盖模式
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
    background: 'rgba(0,0,0,0.98)',
    padding: '16px',
    paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
    overflowY: 'auto',
    overflowX: 'hidden',
    fontFamily: 'sans-serif',
    color: '#fff',
    boxSizing: 'border-box',
    WebkitOverflowScrolling: 'touch',
    wordBreak: 'break-word',
    overflowWrap: 'break-word'
  } : {
    // 平板/桌面：侧边栏模式
    position: 'absolute',
    top: isTablet ? '10px' : '60px',
    left: isTablet ? '10px' : '20px',
    right: 'auto',
    zIndex: 20,
    background: 'rgba(0,0,0,0.95)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '8px',
    padding: '16px',
    width: isTablet ? '320px' : '280px',
    maxWidth: '90vw',
    maxHeight: isTablet ? '85vh' : '80vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    fontFamily: 'sans-serif',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    boxSizing: 'border-box',
    WebkitOverflowScrolling: 'touch',
    wordBreak: 'break-word',
    overflowWrap: 'break-word'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    accentColor: '#FFD700',
    cursor: 'pointer',
    boxSizing: 'border-box'
  };

  const themeButtonStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
    fontSize: '12px',
    transition: 'transform 0.1s ease, box-shadow 0.15s ease, border-color 0.15s ease',
    background: 'rgba(255,255,255,0.05)'
  };

  const THEME_STORAGE_KEY = 'christmas_tree_custom_themes';
  const [themeList, setThemeList] = useState<{ name: string; config: Record<string, unknown> }[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [themeName, setThemeName] = useState<string>('');

  // 仅提取主题相关的视觉字段，避免覆盖照片/时间轴等
  const pickThemeConfig = (cfg: SceneConfig): Record<string, unknown> => ({
    themeLabel: cfg.themeLabel,
    background: cfg.background,
    foliage: {
      enabled: cfg.foliage.enabled,
      count: cfg.foliage.count,
      color: cfg.foliage.color,
      chaosColor: cfg.foliage.chaosColor,
      size: cfg.foliage.size,
      glow: cfg.foliage.glow
    },
    lights: {
      enabled: cfg.lights.enabled,
      count: cfg.lights.count,
      colors: cfg.lights.colors
    },
    elements: {
      enabled: cfg.elements.enabled,
      count: cfg.elements.count,
      colors: cfg.elements.colors,
      styleConfig: cfg.elements.styleConfig
    },
    ribbons: cfg.ribbons,
    fog: cfg.fog,
    spiralRibbon: cfg.spiralRibbon,
    glowingStreaks: cfg.glowingStreaks,
    giftPile: cfg.giftPile,
    textEffect: cfg.textEffect,
    heartEffect: cfg.heartEffect,
    aurora: cfg.aurora,
    shootingStars: cfg.shootingStars
  });

  const loadThemeList = () => {
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as { name: string; config: Record<string, unknown> }[];
      setThemeList(list);
      if (list.length && !selectedTheme) {
        setSelectedTheme(list[0].name);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadThemeList();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveThemeList = (list: { name: string; config: Record<string, unknown> }[]) => {
    setThemeList(list);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  const handleSaveCurrentTheme = () => {
    const name = (themeName || safeConfig.themeLabel || '').trim() || '自定义主题';
    const themeConfig = pickThemeConfig(safeConfig);
    const filtered = themeList.filter(t => t.name !== name);
    const nextList = [{ name, config: themeConfig }, ...filtered].slice(0, 10);
    saveThemeList(nextList);
    setSelectedTheme(name);
    setThemeName(name);
    onChange(mergeConfig(config as unknown as Record<string, unknown>, { ...themeConfig, themeLabel: name } as Record<string, unknown>) as unknown as SceneConfig);
  };

  const handleApplySavedTheme = () => {
    if (!selectedTheme) return;
    const target = themeList.find(t => t.name === selectedTheme);
    if (!target) return;
    onChange(mergeConfig(config as unknown as Record<string, unknown>, { ...target.config, themeLabel: selectedTheme } as Record<string, unknown>) as unknown as SceneConfig);
  };

  const handleNewTheme = () => {
    const defaultCfg = getDefaultSceneConfig() as unknown as SceneConfig;
    const themeConfig = pickThemeConfig(defaultCfg);
    onChange(mergeConfig(config as unknown as Record<string, unknown>, { ...themeConfig, themeLabel: 'default' } as Record<string, unknown>) as unknown as SceneConfig);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    marginTop: '4px',
    boxSizing: 'border-box'
  };

  return (
    <div style={panelStyle}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: useFullScreen ? '12px' : '0',
        borderBottom: useFullScreen ? '1px solid rgba(255,215,0,0.2)' : 'none'
      }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFD700', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={18} /> 场景设置</span>
        <button 
          onClick={onClose} 
          style={{ 
            background: useFullScreen ? 'rgba(255,215,0,0.2)' : 'none', 
            border: useFullScreen ? '1px solid rgba(255,215,0,0.3)' : 'none', 
            color: useFullScreen ? '#FFD700' : '#888', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            padding: useFullScreen ? '8px 16px' : '4px',
            borderRadius: '6px',
            gap: '4px',
            fontSize: '14px'
          }}
        >
          <X size={18} />
          {useFullScreen && '关闭'}
        </button>
      </div>

      {/* 标题文字 */}
      <CollapsibleSection title="顶部标题" icon={<TreePine size={14} />} defaultOpen={true}>
        <div style={labelStyle}>
          <span>显示标题</span>
          <input type="checkbox" checked={safeConfig.title.enabled} onChange={e => onChange({ ...config, title: { ...safeConfig.title, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <input
          type="text"
          value={safeConfig.title.text}
          onChange={e => onChange({ ...config, title: { ...safeConfig.title, text: e.target.value } })}
          placeholder="输入祝福语..."
          style={inputStyle}
        />
        
        {/* 字体选择 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}><span>艺术字体</span></div>
        <select
          value={safeConfig.title.font || 'Mountains of Christmas'}
          onChange={e => onChange({ ...config, title: { ...safeConfig.title, font: e.target.value } })}
          style={{
            width: '90%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          {TITLE_FONTS.map(font => (
            <option key={font.value} value={font.value} style={{ background: '#222', fontFamily: `'${font.value}', cursive` }}>
              {font.label}
            </option>
          ))}
        </select>
        {/* 字体预览 */}
        <div style={{
          marginTop: '8px',
          padding: '10px',
          background: 'rgba(255,215,0,0.1)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{
            fontFamily: `'${safeConfig.title.font || 'Mountains of Christmas'}', cursive`,
            fontSize: '18px',
            color: '#FFD700'
          }}>
            {safeConfig.title.text || 'Merry Christmas'}
          </span>
        </div>
        
        <div style={{ ...labelStyle, marginTop: '10px' }}><span>字体大小: {safeConfig.title.size || 48}px</span></div>
        <input type="range" min="24" max="200" step="4" value={safeConfig.title.size || 48} onChange={e => onChange({ ...config, title: { ...safeConfig.title, size: Number(e.target.value) } })} style={sliderStyle} />
        
        {/* 标题颜色 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
          <div>
            <span style={{ fontSize: '10px', color: '#888' }}>文字颜色</span>
            <ColorPicker
              value={config.title?.color || '#FFD700'}
              onChange={color => onChange({ ...config, title: { ...safeConfig.title, color } })}
            />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: '#888' }}>发光颜色</span>
            <ColorPicker
              value={config.title?.shadowColor || config.title?.color || '#FFD700'}
              onChange={color => onChange({ ...config, title: { ...safeConfig.title, shadowColor: color } })}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 开场文案 */}
      <CollapsibleSection title="开场文案" icon={<Type size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          分享链接打开时显示的开场白
        </p>
        <div style={labelStyle}>
          <span>启用开场</span>
          <input 
            type="checkbox" 
            checked={config.intro?.enabled ?? false} 
            onChange={e => onChange({ ...config, intro: { ...config.intro, enabled: e.target.checked, text: config.intro?.text || '献给最特别的你', duration: config.intro?.duration || 4000 } })} 
            style={{ accentColor: '#FFD700' }} 
          />
        </div>
        {config.intro?.enabled && (
          <>
            <input
              type="text"
              value={config.intro?.text || ''}
              onChange={e => onChange({ ...config, intro: { ...config.intro!, text: e.target.value } })}
              placeholder="主文案（如：献给最特别的你）"
              style={inputStyle}
            />
            <input
              type="text"
              value={config.intro?.subText || ''}
              onChange={e => onChange({ ...config, intro: { ...config.intro!, subText: e.target.value } })}
              placeholder="副文案（可选，如：From 某某）"
              style={{ ...inputStyle, marginTop: '6px' }}
            />
            <div style={{ ...labelStyle, marginTop: '10px' }}><span>显示时长: {(config.intro?.duration || 4000) / 1000}秒</span></div>
            <input 
              type="range" 
              min="2000" 
              max="10000" 
              step="500" 
              value={config.intro?.duration || 4000} 
              onChange={e => onChange({ ...config, intro: { ...config.intro!, duration: Number(e.target.value) } })} 
              style={sliderStyle} 
            />
          </>
        )}
        
        {/* 时间轴模式提示 */}
        {config.timeline?.enabled && (
          <p style={{ fontSize: '10px', color: '#FF9800', margin: '8px 0 0 0', padding: '6px', background: 'rgba(255,152,0,0.1)', borderRadius: '4px' }}>
            ⚠️ 已启用故事线模式，此配置将被忽略
          </p>
        )}
      </CollapsibleSection>

      {/* 故事线模式 */}
      <CollapsibleSection title="故事线模式" icon={<Film size={14} />}>
        <TimelineEditor
          config={config.timeline}
          onChange={(timeline) => onChange({ ...config, timeline })}
          photoCount={photoCount}
          photoPaths={photoPaths}
          configuredTexts={config.gestureTexts || (config.gestureText ? [config.gestureText] : ['MERRY CHRISTMAS'])}
          textSwitchInterval={config.textSwitchInterval || 3}
          onTextsChange={(texts) => onChange({ ...config, gestureTexts: texts, gestureText: texts[0] })}
          onTextIntervalChange={(interval) => onChange({ ...config, textSwitchInterval: interval })}
          onPreview={onTimelinePreview}
          isPlaying={isTimelinePlaying}
        />
      </CollapsibleSection>

      {/* 树叶 */}
      {/* 树形尺寸 */}
      <CollapsibleSection title="树形尺寸" icon={<TreePine size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          调整圣诞树的高度和底部宽度
        </p>
        
        {/* 高度 */}
        <div style={labelStyle}>
          <span>树高度: {config.treeShape?.height || 22}</span>
        </div>
        <input
          type="range"
          min="15"
          max="35"
          step="1"
          value={config.treeShape?.height || 22}
          onChange={e => onChange({
            ...config,
            treeShape: { 
              height: Number(e.target.value),
              radius: config.treeShape?.radius || 9
            }
          })}
          style={sliderStyle}
        />
        
        {/* 底部半径 */}
        <div style={{ ...labelStyle, marginTop: '8px' }}>
          <span>底部宽度: {config.treeShape?.radius || 9}</span>
        </div>
        <input
          type="range"
          min="5"
          max="15"
          step="0.5"
          value={config.treeShape?.radius || 9}
          onChange={e => onChange({
            ...config,
            treeShape: { 
              height: config.treeShape?.height || 22,
              radius: Number(e.target.value)
            }
          })}
          style={sliderStyle}
        />
        
        <p style={{ fontSize: '9px', color: '#666', margin: '8px 0 0 0' }}>
          提示：修改尺寸后需要切换聚合/散开才能看到效果
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="树叶粒子" icon={<TreeDeciduous size={14} />}>
        <div style={labelStyle}>
          <span>显示树叶</span>
          <input type="checkbox" checked={config.foliage.enabled} onChange={e => onChange({ ...config, foliage: { ...config.foliage, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        
        {config.foliage.enabled && (
          <>
            {/* 粒子数量 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>粒子数量: {config.foliage.count || 15000}</span>
            </div>
            <input
              type="range"
              min="5000"
              max="25000"
              step="1000"
              value={config.foliage.count || 15000}
              onChange={e => onChange({ ...config, foliage: { ...config.foliage, count: Number(e.target.value) } })}
              style={sliderStyle}
            />
            <p style={{ fontSize: '9px', color: '#666', margin: '2px 0 0 0' }}>
              数量越多越密集，但会影响性能
            </p>
            
            {/* 颜色设置 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>聚合颜色</span>
                <ColorPicker
                  value={config.foliage.color || '#00FF88'}
                  onChange={color => onChange({ ...config, foliage: { ...config.foliage, color } })}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>散开颜色</span>
                <ColorPicker
                  value={config.foliage.chaosColor || '#004422'}
                  onChange={color => onChange({ ...config, foliage: { ...config.foliage, chaosColor: color } })}
                />
              </div>
            </div>
            
            {/* 粒子大小 */}
            <div style={{ ...labelStyle, marginTop: '10px' }}>
              <span>粒子大小: {(config.foliage.size || 1).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.foliage.size || 1}
              onChange={e => onChange({ ...config, foliage: { ...config.foliage, size: Number(e.target.value) } })}
              style={sliderStyle}
            />
            
            {/* 发光强度 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>发光强度: {(config.foliage.glow || 1).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={config.foliage.glow || 1}
              onChange={e => onChange({ ...config, foliage: { ...config.foliage, glow: Number(e.target.value) } })}
              style={sliderStyle}
            />
          </>
        )}
      </CollapsibleSection>

      {/* 聚合/散开动画 */}
      <CollapsibleSection title="动画效果" icon={<Zap size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 10px 0' }}>
          控制聚合和散开时的动画效果
        </p>
        
        {/* 缓动类型 */}
        <div style={labelStyle}><span>动画类型</span></div>
        <select
          value={config.animation?.easing || 'easeInOut'}
          onChange={e => onChange({ 
            ...config, 
            animation: { 
              easing: e.target.value as AnimationEasing, 
              speed: config.animation?.speed || 1,
              scatterShape: config.animation?.scatterShape || 'sphere',
              gatherShape: config.animation?.gatherShape || 'direct'
            } 
          })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '8px',
            boxSizing: 'border-box'
          }}
        >
          {animationEasingOptions.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: '#222' }}>
              {opt.label} - {opt.desc}
            </option>
          ))}
        </select>
        
        {/* 动画速度 */}
        <div style={{ ...labelStyle, marginTop: '8px' }}>
          <span>动画速度: {(config.animation?.speed || 1).toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.3"
          max="3"
          step="0.1"
          value={config.animation?.speed || 1}
          onChange={e => onChange({ 
            ...config, 
            animation: { 
              easing: config.animation?.easing || 'easeInOut', 
              speed: Number(e.target.value),
              scatterShape: config.animation?.scatterShape || 'sphere',
              gatherShape: config.animation?.gatherShape || 'direct'
            } 
          })}
          style={sliderStyle}
        />
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          0.3x 慢速 | 1x 正常 | 3x 快速
        </p>
        
        {/* 散开形状 */}
        <div style={{ ...labelStyle, marginTop: '12px' }}><span>散开形状</span></div>
        <select
          value={config.animation?.scatterShape || 'sphere'}
          onChange={e => onChange({ 
            ...config, 
            animation: { 
              easing: config.animation?.easing || 'easeInOut', 
              speed: config.animation?.speed || 1,
              scatterShape: e.target.value as ScatterShape,
              gatherShape: config.animation?.gatherShape || 'direct'
            } 
          })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '4px',
            boxSizing: 'border-box'
          }}
        >
          {scatterShapeOptions.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: '#222' }}>
              {opt.label} - {opt.desc}
            </option>
          ))}
        </select>
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          粒子散开时的初始分布形状
        </p>
        
        {/* 聚合形状 */}
        <div style={{ ...labelStyle, marginTop: '12px' }}><span>聚合形状</span></div>
        <select
          value={config.animation?.gatherShape || 'direct'}
          onChange={e => onChange({ 
            ...config, 
            animation: { 
              easing: config.animation?.easing || 'easeInOut', 
              speed: config.animation?.speed || 1,
              scatterShape: config.animation?.scatterShape || 'sphere',
              gatherShape: e.target.value as GatherShape
            } 
          })}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            marginBottom: '4px',
            boxSizing: 'border-box'
          }}
        >
          {gatherShapeOptions.map(opt => (
            <option key={opt.value} value={opt.value} style={{ background: '#222' }}>
              {opt.label} - {opt.desc}
            </option>
          ))}
        </select>
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          粒子聚合时的动画效果
        </p>
      </CollapsibleSection>

      {/* 彩灯 */}
      <CollapsibleSection title="彩灯" icon={<Lightbulb size={14} />}>
        <div style={labelStyle}>
          <span>显示彩灯</span>
          <input type="checkbox" checked={config.lights.enabled} onChange={e => onChange({ ...config, lights: { ...config.lights, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {config.lights.count || 400}</span></div>
        <input type="range" min="100" max="800" step="50" value={config.lights.count || 400} onChange={e => onChange({ ...config, lights: { ...config.lights, count: Number(e.target.value) } })} style={sliderStyle} />
        
        {/* 彩灯颜色 */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ ...labelStyle, marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={12} /> 彩灯颜色</span>
            {config.lights.colors && (
              <button
                onClick={() => onChange({ ...config, lights: { ...config.lights, colors: undefined } })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                重置
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {(['color1', 'color2', 'color3', 'color4'] as const).map((key, idx) => (
              <div key={key}>
                <ColorPicker
                  value={config.lights.colors?.[key] || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'][idx]}
                  onChange={color => onChange({
                    ...config,
                    lights: {
                      ...config.lights,
                      colors: {
                        color1: config.lights.colors?.color1 || '#FF0000',
                        color2: config.lights.colors?.color2 || '#00FF00',
                        color3: config.lights.colors?.color3 || '#0000FF',
                        color4: config.lights.colors?.color4 || '#FFFF00',
                        [key]: color
                      }
                    }
                  })}
                  style={{ height: '28px' }}
                />
              </div>
            ))}
          </div>
          {/* 预览颜色 */}
          <div style={{ 
            marginTop: '6px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '6px',
            padding: '6px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px'
          }}>
            {[
              config.lights.colors?.color1 || '#FF0000',
              config.lights.colors?.color2 || '#00FF00',
              config.lights.colors?.color3 || '#0000FF',
              config.lights.colors?.color4 || '#FFFF00'
            ].map((color, idx) => (
              <div 
                key={idx}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderRadius: '50%', 
                  background: color,
                  boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`
                }} 
              />
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* 圣诞元素 */}
      <CollapsibleSection title="圣诞装饰" icon={<Gift size={14} />}>
        <div style={labelStyle}>
          <span>显示装饰</span>
          <input type="checkbox" checked={config.elements.enabled} onChange={e => onChange({ ...config, elements: { ...config.elements, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {config.elements.count || 500}</span></div>
        <input type="range" min="100" max="1000" step="50" value={config.elements.count || 500} onChange={e => onChange({ ...config, elements: { ...config.elements, count: Number(e.target.value) } })} style={sliderStyle} />
        
        {/* 装饰样式选择 */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Gem size={12} /> 装饰样式</span>
          </div>
          
          {/* 样式选择按钮 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {(Object.keys(DECORATION_STYLE_NAMES) as DecorationStyle[]).map(style => (
              <button
                key={style}
                onClick={() => onChange({
                  ...config,
                  elements: {
                    ...config.elements,
                    styleConfig: {
                      style,
                      material: config.elements.styleConfig?.material || 'standard',
                      transparency: config.elements.styleConfig?.transparency || 0,
                      metalness: config.elements.styleConfig?.metalness || 0.4,
                      roughness: config.elements.styleConfig?.roughness || 0.3,
                      emissiveIntensity: config.elements.styleConfig?.emissiveIntensity || 0.2
                    }
                  }
                })}
                style={{
                  padding: '6px 10px',
                  background: (config.elements.styleConfig?.style || 'classic') === style 
                    ? 'rgba(255,215,0,0.3)' 
                    : 'rgba(255,255,255,0.1)',
                  border: (config.elements.styleConfig?.style || 'classic') === style 
                    ? '1px solid #FFD700' 
                    : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  minWidth: '70px'
                }}
              >
                <span>{DECORATION_STYLE_NAMES[style]}</span>
                <span style={{ fontSize: '9px', color: '#888' }}>{DECORATION_STYLE_DESCRIPTIONS[style]}</span>
              </button>
            ))}
          </div>
          
          {/* 材质类型 */}
          <div style={{ ...labelStyle, marginTop: '8px' }}><span>材质效果</span></div>
          <select
            value={config.elements.styleConfig?.material || 'standard'}
            onChange={e => onChange({
              ...config,
              elements: {
                ...config.elements,
                styleConfig: {
                  style: config.elements.styleConfig?.style || 'classic',
                  material: e.target.value as DecorationMaterial,
                  transparency: config.elements.styleConfig?.transparency || 0,
                  metalness: config.elements.styleConfig?.metalness || 0.4,
                  roughness: config.elements.styleConfig?.roughness || 0.3,
                  emissiveIntensity: config.elements.styleConfig?.emissiveIntensity || 0.2
                }
              }
            })}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
          >
            {(Object.keys(DECORATION_MATERIAL_NAMES) as DecorationMaterial[]).map(mat => (
              <option key={mat} value={mat} style={{ background: '#222' }}>
                {DECORATION_MATERIAL_NAMES[mat]}
              </option>
            ))}
          </select>
          
          {/* 透明度 */}
          <div style={{ ...labelStyle, marginTop: '8px' }}>
            <span>透明度: {Math.round((config.elements.styleConfig?.transparency || 0) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.1"
            value={config.elements.styleConfig?.transparency || 0}
            onChange={e => onChange({
              ...config,
              elements: {
                ...config.elements,
                styleConfig: {
                  ...config.elements.styleConfig,
                  style: config.elements.styleConfig?.style || 'classic',
                  material: config.elements.styleConfig?.material || 'standard',
                  transparency: Number(e.target.value),
                  metalness: config.elements.styleConfig?.metalness || 0.4,
                  roughness: config.elements.styleConfig?.roughness || 0.3,
                  emissiveIntensity: config.elements.styleConfig?.emissiveIntensity || 0.2
                }
              }
            })}
            style={sliderStyle}
          />
          
          {/* 金属度 */}
          <div style={{ ...labelStyle, marginTop: '8px' }}>
            <span>金属光泽: {Math.round((config.elements.styleConfig?.metalness || 0.4) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.elements.styleConfig?.metalness || 0.4}
            onChange={e => onChange({
              ...config,
              elements: {
                ...config.elements,
                styleConfig: {
                  ...config.elements.styleConfig,
                  style: config.elements.styleConfig?.style || 'classic',
                  material: config.elements.styleConfig?.material || 'standard',
                  transparency: config.elements.styleConfig?.transparency || 0,
                  metalness: Number(e.target.value),
                  roughness: config.elements.styleConfig?.roughness || 0.3,
                  emissiveIntensity: config.elements.styleConfig?.emissiveIntensity || 0.2
                }
              }
            })}
            style={sliderStyle}
          />
          
          {/* 发光强度 */}
          <div style={{ ...labelStyle, marginTop: '8px' }}>
            <span>发光强度: {(config.elements.styleConfig?.emissiveIntensity || 0.2).toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={config.elements.styleConfig?.emissiveIntensity || 0.2}
            onChange={e => onChange({
              ...config,
              elements: {
                ...config.elements,
                styleConfig: {
                  ...config.elements.styleConfig,
                  style: config.elements.styleConfig?.style || 'classic',
                  material: config.elements.styleConfig?.material || 'standard',
                  transparency: config.elements.styleConfig?.transparency || 0,
                  metalness: config.elements.styleConfig?.metalness || 0.4,
                  roughness: config.elements.styleConfig?.roughness || 0.3,
                  emissiveIntensity: Number(e.target.value)
                }
              }
            })}
            style={sliderStyle}
          />
        </div>
        
        {/* 装饰类型开关 */}
        <p style={{ fontSize: '10px', color: '#888', margin: '12px 0 6px 0' }}>
          装饰类型（关闭后由其他类型替代）
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {(() => {
            const currentStyle = config.elements.styleConfig?.style || 'classic';
            const typeNames = STYLE_TYPE_NAMES[currentStyle];
            return (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ccc' }}>
                  <input 
                    type="checkbox" 
                    checked={config.elements.types?.box ?? true} 
                    onChange={e => onChange({ 
                      ...config, 
                      elements: { 
                        ...config.elements, 
                        types: { 
                          box: e.target.checked, 
                          sphere: config.elements.types?.sphere ?? true, 
                          cylinder: config.elements.types?.cylinder ?? true 
                        } 
                      } 
                    })} 
                    style={{ accentColor: '#FFD700' }} 
                  />
                  {typeNames[0]}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ccc' }}>
                  <input 
                    type="checkbox" 
                    checked={config.elements.types?.sphere ?? true} 
                    onChange={e => onChange({ 
                      ...config, 
                      elements: { 
                        ...config.elements, 
                        types: { 
                          box: config.elements.types?.box ?? true, 
                          sphere: e.target.checked, 
                          cylinder: config.elements.types?.cylinder ?? true 
                        } 
                      } 
                    })} 
                    style={{ accentColor: '#FFD700' }} 
                  />
                  {typeNames[1]}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ccc' }}>
                  <input 
                    type="checkbox" 
                    checked={config.elements.types?.cylinder ?? true} 
                    onChange={e => onChange({ 
                      ...config, 
                      elements: { 
                        ...config.elements, 
                        types: { 
                          box: config.elements.types?.box ?? true, 
                          sphere: config.elements.types?.sphere ?? true, 
                          cylinder: e.target.checked 
                        } 
                      } 
                    })} 
                    style={{ accentColor: '#FFD700' }} 
                  />
                  {typeNames[2]}
                </label>
              </>
            );
          })()}
        </div>
        
        {/* 闪烁效果配置 */}
        <p style={{ fontSize: '10px', color: '#888', margin: '8px 0 6px 0' }}>
          闪烁效果（飞机灯风格）
        </p>
        <div style={labelStyle}>
          <span>启用闪烁</span>
          <input 
            type="checkbox" 
            checked={config.elements.twinkle?.enabled ?? true} 
            onChange={e => onChange({ 
              ...config, 
              elements: { 
                ...config.elements, 
                twinkle: { 
                  ...config.elements.twinkle,
                  enabled: e.target.checked, 
                  speed: config.elements.twinkle?.speed ?? 1 
                } 
              } 
            })} 
            style={{ accentColor: '#FFD700' }} 
          />
        </div>
        {(config.elements.twinkle?.enabled ?? true) && (
          <>
            <div style={{ ...labelStyle, marginTop: '6px' }}>
              <span>闪烁频率: {(config.elements.twinkle?.speed ?? 1).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={config.elements.twinkle?.speed ?? 1}
              onChange={e => onChange({ 
                ...config, 
                elements: { 
                  ...config.elements, 
                  twinkle: { 
                    ...config.elements.twinkle,
                    enabled: config.elements.twinkle?.enabled ?? true, 
                    speed: Number(e.target.value) 
                  } 
                } 
              })}
              style={sliderStyle}
            />
            <p style={{ fontSize: '9px', color: '#666', margin: '2px 0 0 0' }}>
              0.5x 慢闪 | 1x 正常 | 3x 快闪
            </p>
            
            {/* 闪烁颜色配置 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>闪烁颜色</span>
                <ColorPicker
                  value={config.elements.twinkle?.flashColor || '#FFFFFF'}
                  onChange={color => onChange({
                    ...config,
                    elements: {
                      ...config.elements,
                      twinkle: {
                        ...config.elements.twinkle,
                        enabled: config.elements.twinkle?.enabled ?? true,
                        speed: config.elements.twinkle?.speed ?? 1,
                        flashColor: color
                      }
                    }
                  })}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>基础发光</span>
                <ColorPicker
                  value={config.elements.twinkle?.baseColor || '#FFD700'}
                  onChange={color => onChange({
                    ...config,
                    elements: {
                      ...config.elements,
                      twinkle: {
                        ...config.elements.twinkle,
                        enabled: config.elements.twinkle?.enabled ?? true,
                        speed: config.elements.twinkle?.speed ?? 1,
                        baseColor: color
                      }
                    }
                  })}
                />
              </div>
            </div>
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              闪烁颜色：闪亮时的颜色 | 基础发光：未闪烁时的颜色
            </p>
            
            {/* 重置颜色按钮 */}
            {(config.elements.twinkle?.flashColor || config.elements.twinkle?.baseColor) && (
              <button
                onClick={() => onChange({
                  ...config,
                  elements: {
                    ...config.elements,
                    twinkle: {
                      enabled: config.elements.twinkle?.enabled ?? true,
                      speed: config.elements.twinkle?.speed ?? 1,
                      flashColor: undefined,
                      baseColor: undefined
                    }
                  }
                })}
                style={{
                  marginTop: '6px',
                  padding: '4px 8px',
                  background: 'rgba(255,100,100,0.2)',
                  border: '1px solid rgba(255,100,100,0.3)',
                  borderRadius: '4px',
                  color: '#ff6666',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                重置为默认颜色
              </button>
            )}
          </>
        )}
        
        {/* 自定义装饰图片 */}
        <p style={{ fontSize: '10px', color: '#888', margin: '8px 0 6px 0' }}>
          自定义装饰图片（仅支持 PNG）
        </p>
        
        {/* 方块装饰 */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ ...labelStyle, marginBottom: '4px' }}>
            <span>方块装饰</span>
            {config.elements.customImages?.box && (
              <button
                onClick={() => onChange({ 
                  ...config, 
                  elements: { 
                    ...config.elements, 
                    customImages: { ...config.elements.customImages, box: undefined } 
                  } 
                })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                清除
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".png"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && file.type === 'image/png') {
                const reader = new FileReader();
                reader.onload = () => {
                  onChange({
                    ...config,
                    elements: {
                      ...config.elements,
                      customImages: { ...config.elements.customImages, box: reader.result as string }
                    }
                  });
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
            style={{ width: '90%', fontSize: '10px' }}
          />
          {config.elements.customImages?.box && (
            <img src={config.elements.customImages.box} alt="box" style={{ width: '32px', height: '32px', marginTop: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
          )}
        </div>

        {/* 球体装饰 */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ ...labelStyle, marginBottom: '4px' }}>
            <span>球体装饰</span>
            {config.elements.customImages?.sphere && (
              <button
                onClick={() => onChange({ 
                  ...config, 
                  elements: { 
                    ...config.elements, 
                    customImages: { ...config.elements.customImages, sphere: undefined } 
                  } 
                })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                清除
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".png"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && file.type === 'image/png') {
                const reader = new FileReader();
                reader.onload = () => {
                  onChange({
                    ...config,
                    elements: {
                      ...config.elements,
                      customImages: { ...config.elements.customImages, sphere: reader.result as string }
                    }
                  });
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
            style={{ width: '90%', fontSize: '10px' }}
          />
          {config.elements.customImages?.sphere && (
            <img src={config.elements.customImages.sphere} alt="sphere" style={{ width: '32px', height: '32px', marginTop: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
          )}
        </div>

        {/* 圆柱装饰 */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ ...labelStyle, marginBottom: '4px' }}>
            <span>圆柱装饰</span>
            {config.elements.customImages?.cylinder && (
              <button
                onClick={() => onChange({ 
                  ...config, 
                  elements: { 
                    ...config.elements, 
                    customImages: { ...config.elements.customImages, cylinder: undefined } 
                  } 
                })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                清除
              </button>
            )}
          </div>
          <input
            type="file"
            accept=".png"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file && file.type === 'image/png') {
                const reader = new FileReader();
                reader.onload = () => {
                  onChange({
                    ...config,
                    elements: {
                      ...config.elements,
                      customImages: { ...config.elements.customImages, cylinder: reader.result as string }
                    }
                  });
                };
                reader.readAsDataURL(file);
              }
              e.target.value = '';
            }}
            style={{ width: '90%', fontSize: '10px' }}
          />
          {config.elements.customImages?.cylinder && (
            <img src={config.elements.customImages.cylinder} alt="cylinder" style={{ width: '32px', height: '32px', marginTop: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }} />
          )}
        </div>

        {/* 装饰颜色 */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={12} /> 装饰颜色</span>
            {config.elements.colors && (
              <button
                onClick={() => onChange({ 
                  ...config, 
                  elements: { ...config.elements, colors: undefined } 
                })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                重置
              </button>
            )}
          </div>
          
          {/* 预设方案 */}
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', color: '#888' }}>预设方案</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => onChange({
                    ...config,
                    elements: { ...config.elements, colors: preset.colors }
                  })}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '2px', 
                    background: `linear-gradient(135deg, ${preset.colors.primary} 50%, ${preset.colors.secondary} 50%)` 
                  }} />
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义颜色 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>主色</span>
              <ColorPicker
                value={config.elements.colors?.primary || DEFAULT_DECORATION_COLORS.primary}
                onChange={color => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      primary: color 
                    } 
                  }
                })}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>次色</span>
              <ColorPicker
                value={config.elements.colors?.secondary || DEFAULT_DECORATION_COLORS.secondary}
                onChange={color => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      secondary: color 
                    } 
                  }
                })}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>强调色</span>
              <ColorPicker
                value={config.elements.colors?.accent || DEFAULT_DECORATION_COLORS.accent}
                onChange={color => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      accent: color 
                    } 
                  }
                })}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>糖果色</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <ColorPicker
                  value={config.elements.colors?.candy1 || DEFAULT_DECORATION_COLORS.candy1}
                  onChange={color => onChange({
                    ...config,
                    elements: { 
                      ...config.elements, 
                      colors: { 
                        ...DEFAULT_DECORATION_COLORS,
                        ...config.elements.colors, 
                        candy1: color 
                      } 
                    }
                  })}
                  style={{ flex: 1, height: '28px' }}
                />
                <ColorPicker
                  value={config.elements.colors?.candy2 || DEFAULT_DECORATION_COLORS.candy2}
                  onChange={color => onChange({
                    ...config,
                    elements: { 
                      ...config.elements, 
                      colors: { 
                        ...DEFAULT_DECORATION_COLORS,
                        ...config.elements.colors, 
                        candy2: color 
                      } 
                    }
                  })}
                  style={{ flex: 1, height: '28px' }}
                />
              </div>
            </div>
          </div>
          
          {/* 颜色预览 */}
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'center',
            gap: '8px'
          }}>
            {[
              config.elements.colors?.primary || DEFAULT_DECORATION_COLORS.primary,
              config.elements.colors?.secondary || DEFAULT_DECORATION_COLORS.secondary,
              config.elements.colors?.accent || DEFAULT_DECORATION_COLORS.accent
            ].map((color, idx) => (
              <div 
                key={idx}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: color,
                  boxShadow: `0 0 8px ${color}80`
                }} 
              />
            ))}
            <div style={{ 
              width: '24px', 
              height: '24px', 
              borderRadius: '4px', 
              background: `repeating-linear-gradient(45deg, ${config.elements.colors?.candy1 || DEFAULT_DECORATION_COLORS.candy1}, ${config.elements.colors?.candy1 || DEFAULT_DECORATION_COLORS.candy1} 3px, ${config.elements.colors?.candy2 || DEFAULT_DECORATION_COLORS.candy2} 3px, ${config.elements.colors?.candy2 || DEFAULT_DECORATION_COLORS.candy2} 6px)`
            }} />
          </div>
        </div>
      </CollapsibleSection>

      {/* 照片装饰 */}
      <CollapsibleSection title="照片装饰" icon={<Image size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          已上传 {photoCount} 张照片
        </p>
        
        {/* 照片大小 */}
        <div style={{ ...labelStyle, marginTop: '8px' }}>
          <span>照片大小: {(config.photoOrnaments?.scale || 1.5).toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={config.photoOrnaments?.scale || 1.5}
          onChange={e => onChange({ 
            ...config, 
            photoOrnaments: { 
              ...config.photoOrnaments, 
              scale: Number(e.target.value) 
            } 
          })}
          style={sliderStyle}
        />
        
        {/* 相框颜色 */}
        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>相框颜色</span>
          <ColorPicker
            value={config.photoOrnaments?.frameColor || '#FFFFFF'}
            onChange={color => onChange({ 
              ...config, 
              photoOrnaments: { 
                ...config.photoOrnaments, 
                frameColor: color 
              } 
            })}
            style={{ marginTop: '4px' }}
          />
        </div>
        
        {/* 预览 */}
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            background: config.photoOrnaments?.frameColor || '#FFFFFF',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '38px',
              height: '38px',
              background: '#333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: '#888',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🖼️
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 螺旋带子 */}
      <CollapsibleSection title="螺旋带子" icon={<Ribbon size={14} />}>
        <div style={labelStyle}>
          <span>显示螺旋带子</span>
          <input 
            type="checkbox" 
            checked={config.spiralRibbon?.enabled !== false} 
            onChange={e => onChange({ 
              ...config, 
              spiralRibbon: { 
                ...config.spiralRibbon,
                enabled: e.target.checked,
                color: config.spiralRibbon?.color || '#FF2222',
                glowColor: config.spiralRibbon?.glowColor || '#FF4444',
                width: config.spiralRibbon?.width || 0.8,
                turns: config.spiralRibbon?.turns || 5,
                double: config.spiralRibbon?.double || false
              } 
            })} 
            style={{ accentColor: '#FFD700' }} 
          />
        </div>
        
        {config.spiralRibbon?.enabled !== false && (
          <>
            {/* 颜色设置 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>带子颜色</span>
                <ColorPicker
                  value={config.spiralRibbon?.color || '#FF2222'}
                  onChange={color => onChange({
                    ...config,
                    spiralRibbon: { ...config.spiralRibbon!, color }
                  })}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>发光颜色</span>
                <ColorPicker
                  value={config.spiralRibbon?.glowColor || '#FF4444'}
                  onChange={color => onChange({
                    ...config,
                    spiralRibbon: { ...config.spiralRibbon!, glowColor: color }
                  })}
                />
              </div>
            </div>
            
            {/* 宽度 */}
            <div style={{ ...labelStyle, marginTop: '10px' }}>
              <span>带子宽度: {(config.spiralRibbon?.width || 0.8).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2"
              step="0.1"
              value={config.spiralRibbon?.width || 0.8}
              onChange={e => onChange({
                ...config,
                spiralRibbon: { ...config.spiralRibbon!, width: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
            
            {/* 圈数 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>盘旋圈数: {config.spiralRibbon?.turns || 5}</span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={config.spiralRibbon?.turns || 5}
              onChange={e => onChange({
                ...config,
                spiralRibbon: { ...config.spiralRibbon!, turns: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
            
            {/* 双层 */}
            <div style={{ ...labelStyle, marginTop: '10px' }}>
              <span>双层带子</span>
              <input
                type="checkbox"
                checked={config.spiralRibbon?.double || false}
                onChange={e => onChange({
                  ...config,
                  spiralRibbon: { ...config.spiralRibbon!, double: e.target.checked }
                })}
                style={{ accentColor: '#FFD700' }}
              />
            </div>
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              双层会显示两条交错的带子（红+金）
            </p>
          </>
        )}
      </CollapsibleSection>

      {/* 发光流线 */}
      <CollapsibleSection title="发光流线" icon={<Sparkles size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          动态发光线条环绕圣诞树飞舞
        </p>
        <div style={labelStyle}>
          <span>启用流线</span>
          <input 
            type="checkbox" 
            checked={config.glowingStreaks?.enabled || false} 
            onChange={e => onChange({ 
              ...config, 
              glowingStreaks: { 
                ...config.glowingStreaks,
                enabled: e.target.checked,
                count: config.glowingStreaks?.count || 5,
                color: config.glowingStreaks?.color || '#FFD700',
                speed: config.glowingStreaks?.speed || 1,
                tailLength: config.glowingStreaks?.tailLength || 1.2,
                lineWidth: config.glowingStreaks?.lineWidth || 3
              } 
            })} 
            style={{ accentColor: '#FFD700' }} 
          />
        </div>
        
        {config.glowingStreaks?.enabled && (
          <>
            {/* 颜色 */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>流线颜色</span>
              <ColorPicker
                value={config.glowingStreaks?.color || '#FFD700'}
                onChange={color => onChange({
                  ...config,
                  glowingStreaks: { ...config.glowingStreaks!, color }
                })}
              />
            </div>
            
            {/* 数量 */}
            <div style={{ ...labelStyle, marginTop: '10px' }}>
              <span>流线数量: {config.glowingStreaks?.count || 5}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={config.glowingStreaks?.count || 5}
              onChange={e => onChange({
                ...config,
                glowingStreaks: { ...config.glowingStreaks!, count: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
            
            {/* 速度 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>飞行速度: {(config.glowingStreaks?.speed || 1).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.1"
              value={config.glowingStreaks?.speed || 1}
              onChange={e => onChange({
                ...config,
                glowingStreaks: { ...config.glowingStreaks!, speed: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
            
            {/* 拖尾长度 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>拖尾长度: {(config.glowingStreaks?.tailLength || 1.2).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.1"
              value={config.glowingStreaks?.tailLength || 1.2}
              onChange={e => onChange({
                ...config,
                glowingStreaks: { ...config.glowingStreaks!, tailLength: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
            
            {/* 线条粗细 */}
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>线条粗细: {config.glowingStreaks?.lineWidth || 3}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={config.glowingStreaks?.lineWidth || 3}
              onChange={e => onChange({
                ...config,
                glowingStreaks: { ...config.glowingStreaks!, lineWidth: Number(e.target.value) }
              })}
              style={sliderStyle}
            />
          </>
        )}
      </CollapsibleSection>

      {/* 礼物堆 */}
      <CollapsibleSection title="树底礼物" icon={<Gift size={14} />}>
        <div style={labelStyle}>
          <span>显示礼物堆</span>
          <input type="checkbox" checked={safeConfig.giftPile.enabled} onChange={e => onChange({ ...config, giftPile: { ...safeConfig.giftPile, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {safeConfig.giftPile.count || 18}</span></div>
        <input type="range" min="5" max="50" step="1" value={safeConfig.giftPile.count || 18} onChange={e => onChange({ ...config, giftPile: { ...safeConfig.giftPile, count: Number(e.target.value) } })} style={sliderStyle} />
        {/* 礼物颜色 */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ ...labelStyle, marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={12} /> 礼物颜色</span>
            {config.giftPile?.colors && (
              <button
                onClick={() => onChange({ ...config, giftPile: { ...safeConfig.giftPile, colors: undefined } })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                重置
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {[0, 1, 2, 3].map(idx => (
              <ColorPicker
                key={idx}
                value={(config.giftPile?.colors || ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'])[idx]}
                onChange={color => {
                  const newColors = [...(config.giftPile?.colors || ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'])];
                  newColors[idx] = color;
                  onChange({ ...config, giftPile: { ...safeConfig.giftPile, colors: newColors } });
                }}
                style={{ height: '24px' }}
              />
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* 飘落丝带 */}
      <CollapsibleSection title="飘落丝带" icon={<Ribbon size={14} />}>
        <div style={labelStyle}>
          <span>显示丝带</span>
          <input type="checkbox" checked={safeConfig.ribbons.enabled} onChange={e => onChange({ ...config, ribbons: { ...safeConfig.ribbons, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {safeConfig.ribbons.count}</span></div>
        <input type="range" min="10" max="100" step="5" value={safeConfig.ribbons.count} onChange={e => onChange({ ...config, ribbons: { ...safeConfig.ribbons, count: Number(e.target.value) } })} style={sliderStyle} />
        {/* 丝带颜色 */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ ...labelStyle, marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Palette size={12} /> 丝带颜色</span>
            {config.ribbons?.colors && (
              <button
                onClick={() => onChange({ ...config, ribbons: { ...safeConfig.ribbons, colors: undefined } })}
                style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
              >
                重置
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            {[0, 1, 2, 3, 4].map(idx => (
              <ColorPicker
                key={idx}
                value={(config.ribbons?.colors || ['#FFD700', '#D32F2F', '#ECEFF1', '#FF69B4', '#00CED1'])[idx]}
                onChange={color => {
                  const newColors = [...(config.ribbons?.colors || ['#FFD700', '#D32F2F', '#ECEFF1', '#FF69B4', '#00CED1'])];
                  newColors[idx] = color;
                  onChange({ ...config, ribbons: { ...safeConfig.ribbons, colors: newColors } });
                }}
                style={{ height: '24px' }}
              />
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* 雪花 */}
      <CollapsibleSection title="雪花" icon={<Snowflake size={14} />}>
        <div style={labelStyle}>
          <span>显示雪花</span>
          <input type="checkbox" checked={config.snow.enabled} onChange={e => onChange({ ...config, snow: { ...config.snow, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {config.snow.count}</span></div>
        <input type="range" min="500" max="5000" step="100" value={config.snow.count} onChange={e => onChange({ ...config, snow: { ...config.snow, count: Number(e.target.value) } })} style={sliderStyle} />
        <div style={{ ...labelStyle, marginTop: '8px' }}><span>速度: {config.snow.speed.toFixed(1)}</span></div>
        <input type="range" min="0.5" max="5" step="0.1" value={config.snow.speed} onChange={e => onChange({ ...config, snow: { ...config.snow, speed: Number(e.target.value) } })} style={sliderStyle} />
        <div style={{ ...labelStyle, marginTop: '8px' }}><span>大小: {config.snow.size.toFixed(2)}</span></div>
        <input type="range" min="0.5" max="5" step="0.1" value={config.snow.size} onChange={e => onChange({ ...config, snow: { ...config.snow, size: Number(e.target.value) } })} style={sliderStyle} />
        <div style={{ ...labelStyle, marginTop: '8px' }}><span>透明度: {config.snow.opacity.toFixed(1)}</span></div>
        <input type="range" min="0.1" max="1" step="0.1" value={config.snow.opacity} onChange={e => onChange({ ...config, snow: { ...config.snow, opacity: Number(e.target.value) } })} style={sliderStyle} />
      </CollapsibleSection>

      {/* 底部雾气 */}
      <CollapsibleSection title="底部雾气" icon={<CloudFog size={14} />}>
        <div style={labelStyle}>
          <span>显示雾气</span>
          <input type="checkbox" checked={safeConfig.fog.enabled} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>粒子数量: {safeConfig.fog.count || 800}</span></div>
        <input type="range" min="200" max="2000" step="100" value={safeConfig.fog.count || 800} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, count: Number(e.target.value) } })} style={sliderStyle} />
        <div style={labelStyle}><span>粒子大小: {(safeConfig.fog.size || 0.8).toFixed(1)}</span></div>
        <input type="range" min="0.2" max="2" step="0.1" value={safeConfig.fog.size || 0.8} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, size: Number(e.target.value) } })} style={sliderStyle} />
        <div style={labelStyle}><span>范围: {(safeConfig.fog.spread || 1).toFixed(1)}</span></div>
        <input type="range" min="0.5" max="2" step="0.1" value={safeConfig.fog.spread || 1} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, spread: Number(e.target.value) } })} style={sliderStyle} />
        <div style={labelStyle}><span>高度: {(safeConfig.fog.height || 1.5).toFixed(1)}</span></div>
        <input type="range" min="0.5" max="4" step="0.5" value={config.fog?.height || 1.5} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, height: Number(e.target.value) } })} style={sliderStyle} />
        <div style={labelStyle}><span>透明度: {safeConfig.fog.opacity.toFixed(1)}</span></div>
        <input type="range" min="0.1" max="1" step="0.05" value={safeConfig.fog.opacity} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, opacity: Number(e.target.value) } })} style={sliderStyle} />
        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>雾气颜色</span>
          <ColorPicker
            value={config.fog?.color || '#ffffff'}
            onChange={color => onChange({ ...config, fog: { ...safeConfig.fog, color } })}
            style={{ marginTop: '4px' }}
          />
        </div>
      </CollapsibleSection>

      {/* 闪光 */}
      <CollapsibleSection title="闪光粒子" icon={<Sparkles size={14} />}>
        <div style={labelStyle}>
          <span>显示闪光</span>
          <input type="checkbox" checked={config.sparkles.enabled} onChange={e => onChange({ ...config, sparkles: { ...config.sparkles, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {config.sparkles.count}</span></div>
        <input type="range" min="100" max="1500" step="50" value={config.sparkles.count} onChange={e => onChange({ ...config, sparkles: { ...config.sparkles, count: Number(e.target.value) } })} style={sliderStyle} />
      </CollapsibleSection>

      {/* 星空 */}
      <CollapsibleSection title="背景星空" icon={<Star size={14} />}>
        <div style={labelStyle}>
          <span>显示星空</span>
          <input type="checkbox" checked={config.stars.enabled} onChange={e => onChange({ ...config, stars: { ...config.stars, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        {config.stars.enabled && (
          <>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>星星数量: {config.stars.count || 5000}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={config.stars.count || 5000}
              onChange={e => onChange({ ...config, stars: { ...config.stars, count: Number(e.target.value) } })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>星星亮度: {(config.stars.brightness || 4).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={config.stars.brightness || 4}
              onChange={e => onChange({ ...config, stars: { ...config.stars, brightness: Number(e.target.value) } })}
              style={sliderStyle}
            />
          </>
        )}
      </CollapsibleSection>

      {/* 视觉增强效果 */}
      <VisualEnhancementsSettings
        bells={config.bells}
        shootingStars={config.shootingStars}
        aurora={config.aurora}
        fireworks={config.fireworks}
        musicWaves={config.musicWaves}
        onBellsChange={(bells) => onChange({ ...config, bells })}
        onShootingStarsChange={(shootingStars) => onChange({ ...config, shootingStars })}
        onAuroraChange={(aurora) => onChange({ ...config, aurora })}
        onFireworksChange={(fireworks) => onChange({ ...config, fireworks })}
        onMusicWavesChange={(musicWaves) => onChange({ ...config, musicWaves })}
      />

      {/* 树顶星星/头像 */}
      <CollapsibleSection title="树顶星星" icon={<Star size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          上传头像替换树顶星星（五角星形状裁剪）
        </p>
        <div style={{ ...labelStyle, marginBottom: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={12} /> 上传头像</span>
          {config.topStar?.avatarUrl && (
            <button
              onClick={() => onChange({ ...config, topStar: { avatarUrl: undefined } })}
              style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
            >
              恢复星星
            </button>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 5 * 1024 * 1024) {
                alert('图片不能超过 5MB');
                e.target.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                // 触发裁剪器
                if (typeof onAvatarUpload === 'function') {
                  onAvatarUpload(reader.result as string);
                }
              };
              reader.readAsDataURL(file);
            }
            e.target.value = '';
          }}
          style={{ width: '90%', fontSize: '10px' }}
        />
        {config.topStar?.avatarUrl && (
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <img 
              src={config.topStar.avatarUrl} 
              alt="avatar" 
              style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '4px',
                border: '2px solid #FFD700'
              }} 
            />
            <p style={{ fontSize: '10px', color: '#4CAF50', margin: '4px 0 0 0' }}>
              ✓ 已设置头像
            </p>
          </div>
        )}
        
        <div style={{ ...labelStyle, marginTop: '12px' }}>
          <span>星星大小: {(config.topStar?.size || 1.0).toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.3"
          max="3.0"
          step="0.1"
          value={config.topStar?.size || 1.0}
          onChange={e => onChange({ 
            ...config, 
            topStar: { 
              ...config.topStar, 
              size: Number(e.target.value) 
            } 
          })}
          style={sliderStyle}
        />
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          调节树顶星星的大小（0.3-3.0倍）
        </p>
      </CollapsibleSection>

      {/* Bloom 效果 */}
      <CollapsibleSection title="泛光效果" icon={<Rainbow size={14} />}>
        <div style={labelStyle}>
          <span>开启泛光</span>
          <input type="checkbox" checked={config.bloom.enabled} onChange={e => onChange({ ...config, bloom: { ...config.bloom, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>强度: {config.bloom.intensity.toFixed(1)}</span></div>
        <input type="range" min="0.5" max="3" step="0.1" value={config.bloom.intensity} onChange={e => onChange({ ...config, bloom: { ...config.bloom, intensity: Number(e.target.value) } })} style={sliderStyle} />
      </CollapsibleSection>

      {/* 场景背景 */}
      <CollapsibleSection title="场景背景" icon={<Palette size={14} />}>
        <div style={{ marginTop: '4px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>背景颜色</span>
          <ColorPicker
            value={config.background?.color || '#000300'}
            onChange={color => onChange({ ...config, background: { color } })}
            style={{ marginTop: '4px' }}
          />
        </div>
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          深色背景效果更佳
        </p>
      </CollapsibleSection>

      {/* 爱心特效 */}
      <CollapsibleSection title="爱心特效" icon={<Heart size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          手势或故事线触发的爱心效果
        </p>
        
        {/* 爱心颜色 */}
        <div>
          <span style={{ fontSize: '10px', color: '#888' }}>爱心颜色</span>
          <ColorPicker
            value={config.heartEffect?.color || '#FF1493'}
            onChange={color => onChange({ ...config, heartEffect: { ...config.heartEffect, color } })}
          />
        </div>
        
        {/* 爱心大小 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}>
          <span>爱心大小: {(config.heartEffect?.size || 1).toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={config.heartEffect?.size || 1}
          onChange={e => onChange({ ...config, heartEffect: { ...config.heartEffect, color: config.heartEffect?.color || '#FF1493', size: Number(e.target.value) } })}
          style={sliderStyle}
        />
        
        {/* 爱心粒子数量 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}>
          <span>粒子数量: {config.gestureEffect?.heartCount || 1500}</span>
        </div>
        <input
          type="range"
          min="500"
          max="3000"
          step="100"
          value={config.gestureEffect?.heartCount || 1500}
          onChange={e => onChange({
            ...config,
            gestureEffect: {
              ...config.gestureEffect,
              duration: config.gestureEffect?.duration || 3000,
              hideTree: config.gestureEffect?.hideTree ?? true,
              textCount: config.gestureEffect?.textCount || 1000,
              heartCount: Number(e.target.value)
            }
          })}
          style={sliderStyle}
        />
        
        {/* 照片切换间隔 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}>
          <span>照片间隔: {((config.heartEffect?.photoInterval || 3000) / 1000).toFixed(1)}秒</span>
        </div>
        <input
          type="range"
          min="1000"
          max="10000"
          step="500"
          value={config.heartEffect?.photoInterval || 3000}
          onChange={e => onChange({ ...config, heartEffect: { ...config.heartEffect, color: config.heartEffect?.color || '#FF1493', photoInterval: Number(e.target.value) } })}
          style={sliderStyle}
        />
        <p style={{ fontSize: '9px', color: '#666', margin: '2px 0 0 0' }}>
          爱心中照片轮播的切换间隔
        </p>
        
        {/* 相框设置 */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: 'bold' }}>🖼️ 相框设置</span>
          
          <div style={{ ...labelStyle, marginTop: '8px' }}>
            <span>相框大小: {(config.heartEffect?.photoScale || 1).toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={config.heartEffect?.photoScale || 1}
            onChange={e => onChange({ 
              ...config, 
              heartEffect: { 
                ...config.heartEffect, 
                color: config.heartEffect?.color || '#FF1493',
                photoScale: Number(e.target.value) 
              } 
            })}
            style={sliderStyle}
          />
          
          <div style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: '#888' }}>相框颜色</span>
            <ColorPicker
              value={config.heartEffect?.frameColor || '#FFFFFF'}
              onChange={color => onChange({ 
                ...config, 
                heartEffect: { 
                  ...config.heartEffect, 
                  color: config.heartEffect?.color || '#FF1493',
                  frameColor: color 
                } 
              })}
            />
          </div>
        </div>
        
        {/* 爱心流光效果 */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={labelStyle}>
            <span>💫 边框流光</span>
            <input 
              type="checkbox" 
              checked={config.heartEffect?.glowTrail?.enabled ?? true} 
              onChange={e => onChange({ 
                ...config, 
                heartEffect: { 
                  ...config.heartEffect, 
                  color: config.heartEffect?.color || '#FF1493',
                  glowTrail: { 
                    ...config.heartEffect?.glowTrail, 
                    enabled: e.target.checked 
                  } 
                } 
              })} 
              style={{ accentColor: '#FFD700' }} 
            />
          </div>
          {(config.heartEffect?.glowTrail?.enabled ?? true) && (
            <>
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '10px', color: '#888' }}>流光颜色</span>
                <ColorPicker
                  value={config.heartEffect?.glowTrail?.color || config.heartEffect?.color || '#FF1493'}
                  onChange={color => onChange({ 
                    ...config, 
                    heartEffect: { 
                      ...config.heartEffect, 
                      color: config.heartEffect?.color || '#FF1493',
                      glowTrail: { 
                        ...config.heartEffect?.glowTrail, 
                        enabled: config.heartEffect?.glowTrail?.enabled ?? true,
                        color 
                      } 
                    } 
                  })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#888' }}>速度: {config.heartEffect?.glowTrail?.speed || 3}</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={config.heartEffect?.glowTrail?.speed || 3}
                    onChange={e => onChange({ 
                      ...config, 
                      heartEffect: { 
                        ...config.heartEffect, 
                        color: config.heartEffect?.color || '#FF1493',
                        glowTrail: { 
                          ...config.heartEffect?.glowTrail, 
                          enabled: config.heartEffect?.glowTrail?.enabled ?? true,
                          speed: Number(e.target.value) 
                        } 
                      } 
                    })}
                    style={sliderStyle}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#888' }}>数量: {config.heartEffect?.glowTrail?.count || 2}</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={config.heartEffect?.glowTrail?.count || 2}
                    onChange={e => onChange({ 
                      ...config, 
                      heartEffect: { 
                        ...config.heartEffect, 
                        color: config.heartEffect?.color || '#FF1493',
                        glowTrail: { 
                          ...config.heartEffect?.glowTrail, 
                          enabled: config.heartEffect?.glowTrail?.enabled ?? true,
                          count: Number(e.target.value) 
                        } 
                      } 
                    })}
                    style={sliderStyle}
                  />
                </div>
              </div>
              <div style={{ ...labelStyle, marginTop: '8px' }}>
                <span>流光大小: {(config.heartEffect?.glowTrail?.size || 1.5).toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={config.heartEffect?.glowTrail?.size || 1.5}
                onChange={e => onChange({ 
                  ...config, 
                  heartEffect: { 
                    ...config.heartEffect, 
                    color: config.heartEffect?.color || '#FF1493',
                    glowTrail: { 
                      ...config.heartEffect?.glowTrail, 
                      enabled: config.heartEffect?.glowTrail?.enabled ?? true,
                      size: Number(e.target.value) 
                    } 
                  } 
                })}
                style={sliderStyle}
              />
            </>
          )}
        </div>
        
        {/* 底部文字配置 */}
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: 'bold' }}>✨ 底部文字</span>
          <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 8px 0' }}>
            在爱心下方显示粒子文字效果（支持中文）
          </p>
          
          <input
            type="text"
            value={config.heartEffect?.bottomText || ''}
            onChange={e => onChange({ 
              ...config, 
              heartEffect: { 
                ...config.heartEffect, 
                color: config.heartEffect?.color || '#FF1493',
                bottomText: e.target.value 
              } 
            })}
            placeholder="输入底部文字（如：我爱你）"
            style={inputStyle}
          />
          
          {config.heartEffect?.bottomText && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#888' }}>文字颜色</span>
                  <ColorPicker
                    value={config.heartEffect?.bottomTextColor || '#FFD700'}
                    onChange={color => onChange({ 
                      ...config, 
                      heartEffect: { 
                        ...config.heartEffect, 
                        color: config.heartEffect?.color || '#FF1493',
                        bottomTextColor: color 
                      } 
                    })}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#888' }}>文字大小: {(config.heartEffect?.bottomTextSize || 1).toFixed(1)}x</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={config.heartEffect?.bottomTextSize || 1}
                    onChange={e => onChange({ 
                      ...config, 
                      heartEffect: { 
                        ...config.heartEffect, 
                        color: config.heartEffect?.color || '#FF1493',
                        bottomTextSize: Number(e.target.value) 
                      } 
                    })}
                    style={sliderStyle}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>
      
      {/* 文字特效 */}
      <CollapsibleSection title="文字特效" icon={<Type size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          手势或故事线触发的文字效果
        </p>
        
        {/* 文字颜色 */}
        <div>
          <span style={{ fontSize: '10px', color: '#888' }}>文字颜色</span>
          <ColorPicker
            value={config.textEffect?.color || '#FFD700'}
            onChange={color => onChange({ ...config, textEffect: { ...config.textEffect, color } })}
          />
        </div>
        
        {/* 文字大小 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}>
          <span>文字大小: {(config.textEffect?.size || 1).toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={config.textEffect?.size || 1}
          onChange={e => onChange({ ...config, textEffect: { ...config.textEffect, color: config.textEffect?.color || '#FFD700', size: Number(e.target.value) } })}
          style={sliderStyle}
        />
        
        {/* 文字粒子数量 */}
        <div style={{ ...labelStyle, marginTop: '10px' }}>
          <span>粒子数量: {config.gestureEffect?.textCount || 1000}</span>
        </div>
        <input
          type="range"
          min="500"
          max="2000"
          step="100"
          value={config.gestureEffect?.textCount || 1000}
          onChange={e => onChange({
            ...config,
            gestureEffect: {
              ...config.gestureEffect,
              duration: config.gestureEffect?.duration || 3000,
              hideTree: config.gestureEffect?.hideTree ?? true,
              textCount: Number(e.target.value),
              heartCount: config.gestureEffect?.heartCount || 1500
            }
          })}
          style={sliderStyle}
        />
      </CollapsibleSection>

      {/* 背景音乐 */}
      <CollapsibleSection title="背景音乐" icon={<Music size={14} />}>
        {/* 音乐选择 */}
        <div style={labelStyle}><span>选择音乐</span></div>
        <select
          value={safeConfig.music.selected}
          onChange={e => {
            const selected = e.target.value;
            if (selected === 'custom') {
              onChange({ ...config, music: { ...safeConfig.music, selected } });
            } else {
              onChange({ ...config, music: { ...safeConfig.music, selected, customUrl: undefined } });
            }
          }}
          style={{
            width: '90%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          {PRESET_MUSIC.map(music => (
            <option key={music.id} value={music.id} style={{ background: '#222' }}>
              {music.name}
            </option>
          ))}
          <option value="custom" style={{ background: '#222' }}>🎤 自定义音乐</option>
        </select>

        {/* 自定义音乐上传 */}
        {safeConfig.music.selected === 'custom' && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ ...labelStyle, marginBottom: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={12} /> 上传音乐文件</span>
              {safeConfig.music.customUrl && (
                <button
                  onClick={() => onChange({ ...config, music: { ...safeConfig.music, customUrl: undefined } })}
                  style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer', fontSize: '10px' }}
                >
                  清除
                </button>
              )}
            </div>
            <input
              type="file"
              accept="audio/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // 限制文件大小 10MB
                  if (file.size > 10 * 1024 * 1024) {
                    alert('音乐文件不能超过 10MB');
                    e.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    console.log('Music file loaded, updating config with customUrl');
                    onChange({
                      ...config,
                      music: { ...safeConfig.music, customUrl: reader.result as string }
                    });
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
              style={{ width: '90%', fontSize: '10px' }}
            />
            {safeConfig.music.customUrl && (
              <p style={{ fontSize: '10px', color: '#4CAF50', margin: '6px 0 0 0' }}>
                ✓ 已上传自定义音乐
              </p>
            )}
            <p style={{ fontSize: '9px', color: '#666', margin: '6px 0 0 0' }}>
              支持 MP3、WAV、OGG 格式，最大 10MB
            </p>
          </div>
        )}

        {/* 音量控制 */}
        <div style={{ ...labelStyle, marginTop: '12px' }}>
          <span>音量: {Math.round(safeConfig.music.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={safeConfig.music.volume}
          onChange={e => onChange({ ...config, music: { ...safeConfig.music, volume: Number(e.target.value) } })}
          style={sliderStyle}
        />

        {/* 歌词字幕开关 */}
        <div style={{ ...labelStyle, marginTop: '12px' }}>
          <span>显示歌词字幕</span>
          <input
            type="checkbox"
            checked={safeConfig.music.showLyrics ?? true}
            onChange={e => onChange({ ...config, music: { ...safeConfig.music, showLyrics: e.target.checked } })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
          部分歌曲支持歌词同步显示
        </p>
      </CollapsibleSection>

      {/* 主题预设 / 手势也可切换 */}
      <CollapsibleSection title="主题预设" icon={<Palette size={14} />} defaultOpen={false}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 10px 0' }}>
          一键切换圣诞装饰主题（不影响照片/音乐/时间轴）。手势也可映射到主题动作。
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyThemePreset('classic')}
            style={{ ...themeButtonStyle, background: '#1f2a1f', border: '1px solid rgba(255,215,0,0.4)', flex: '1 1 120px' }}
          >
            🎄 经典绿红金
          </button>
          <button
            onClick={() => applyThemePreset('icy')}
            style={{ ...themeButtonStyle, background: '#0b1b2e', border: '1px solid rgba(125,225,255,0.5)', flex: '1 1 120px' }}
          >
            ❄️ 冰蓝银白
          </button>
          <button
            onClick={() => applyThemePreset('candy')}
            style={{ ...themeButtonStyle, background: '#2b0d1f', border: '1px solid rgba(255,111,181,0.5)', flex: '1 1 120px' }}
          >
            🍭 粉色糖果
          </button>
        </div>

        {/* 主题管理（轻量化，仅按钮+下拉） */}
        <div style={{ marginTop: '12px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>
            <span>当前主题: {safeConfig.themeLabel || '未命名'}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleSaveCurrentTheme}
              style={{ ...themeButtonStyle, padding: '8px 10px', width: 'auto', border: '1px solid rgba(0,200,120,0.6)', background: 'rgba(0,200,120,0.08)' }}
            >
              保存当前主题
            </button>
            <button
              onClick={handleNewTheme}
              style={{ ...themeButtonStyle, padding: '8px 10px', width: 'auto' }}
            >
              新建主题（重置视觉）
            </button>
            <input
              placeholder="主题名称（保存时可覆盖）"
              value={themeName}
              onChange={e => setThemeName(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                padding: '6px 8px',
                minWidth: '180px',
                fontSize: '12px'
              }}
            />
          </div>

          {/* 已保存主题列表（按钮应用） */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {themeList.length === 0 && (
              <span style={{ fontSize: '11px', color: '#777' }}>还没有保存的主题，先点“保存当前主题”试试。</span>
            )}
            {themeList.map(t => (
              <button
                key={t.name}
                onClick={() => { setSelectedTheme(t.name); handleApplySavedTheme(); setThemeName(t.name); }}
                style={{
                  ...themeButtonStyle,
                  padding: '8px 10px',
                  width: 'auto',
                  border: selectedTheme === t.name ? '1px solid rgba(0,200,120,0.7)' : '1px solid rgba(255,255,255,0.2)',
                  background: selectedTheme === t.name ? 'rgba(0,200,120,0.1)' : 'rgba(255,255,255,0.05)'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '9px', color: '#666', margin: '8px 0 0 0' }}>
            保存/应用只影响视觉配置，照片/音乐/时间轴保持不变。保存同名将覆盖原有主题。
          </p>
        </div>
      </CollapsibleSection>

      {/* AI 手势识别 */}
      <CollapsibleSection title="AI 手势识别" icon={<Bot size={14} />}>
        <div style={labelStyle}>
          <span>启用 AI</span>
          <input type="checkbox" checked={aiEnabled} onChange={e => onAiToggle(e.target.checked)} style={{ accentColor: '#FFD700' }} />
        </div>
        
        {aiEnabled && (
          <>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>视角控制速度: {safeConfig.cameraSensitivity}</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={safeConfig.cameraSensitivity}
              onChange={e => onChange({ ...config, cameraSensitivity: Number(e.target.value) })}
              style={sliderStyle}
            />
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              调节手掌张开时旋转视角的灵敏度（数值越大转动越快，最高200）
            </p>
            
            <div style={{ ...labelStyle, marginTop: '12px' }}>
              <span>放大缩小速度: {safeConfig.zoomSpeed || 100}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={safeConfig.zoomSpeed || 100}
              onChange={e => onChange({ ...config, zoomSpeed: Number(e.target.value) })}
              style={sliderStyle}
            />
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              调节五指张开时放大缩小的速度（数值越大缩放越快，最高200）
            </p>
          </>
        )}
        
        <p style={{ fontSize: '10px', color: '#666', margin: '12px 0 0 0' }}>
          {isMobile() ? '移动端建议关闭以提升性能' : '需要摄像头权限，用手势控制树'}
        </p>
      </CollapsibleSection>

      {/* 手势配置 */}
      {aiEnabled && (
        <CollapsibleSection title="手势映射" icon={<Hand size={14} />}>
          <p style={{ fontSize: '10px', color: '#888', margin: '0 0 10px 0' }}>
            自定义每个手势对应的功能
          </p>
          {(Object.keys(gestureNames) as Array<keyof GestureConfig>).map(gesture => (
            <div key={gesture} style={{ ...labelStyle, marginBottom: '10px' }}>
              <span style={{ fontSize: '11px' }}>{gestureNames[gesture]}</span>
              <select
                value={safeConfig.gestures[gesture]}
                onChange={e => onChange({
                  ...config,
                  gestures: {
                    ...safeConfig.gestures,
                    [gesture]: e.target.value as GestureAction
                  }
                })}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {gestureActionOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#222' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          
          {/* 分享时先显示文字 */}
          <div style={{ marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ ...labelStyle, paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span>分享链接先显示文字</span>
              <input
                type="checkbox"
                checked={config.preloadText ?? false}
                onChange={e => onChange({ ...config, preloadText: e.target.checked })}
                style={{ accentColor: '#FFD700' }}
              />
            </div>
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              勾选后，打开分享链接会先播放文字效果，再显示圣诞树
            </p>
          </div>

          {/* 特效配置 */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFD700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} /> 特效配置</div>
            
            <div style={labelStyle}>
              <span>显示时隐藏圣诞树</span>
              <input
                type="checkbox"
                checked={config.gestureEffect?.hideTree ?? true}
                onChange={e => onChange({
                  ...config,
                  gestureEffect: {
                    ...config.gestureEffect,
                    duration: config.gestureEffect?.duration || 3000,
                    hideTree: e.target.checked,
                    textCount: config.gestureEffect?.textCount || 1000,
                    heartCount: config.gestureEffect?.heartCount || 1500
                  }
                })}
                style={{ accentColor: '#FFD700' }}
              />
            </div>

            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>持续时间: {((config.gestureEffect?.duration || 3000) / 1000).toFixed(1)}秒</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={config.gestureEffect?.duration || 3000}
              onChange={e => onChange({
                ...config,
                gestureEffect: {
                  ...config.gestureEffect,
                  duration: Number(e.target.value),
                  hideTree: config.gestureEffect?.hideTree ?? true,
                  textCount: config.gestureEffect?.textCount || 1000,
                  heartCount: config.gestureEffect?.heartCount || 1500
                }
              })}
              style={sliderStyle}
            />

            <p style={{ fontSize: '9px', color: '#666', margin: '8px 0 0 0' }}>
              粒子数量和颜色请在"爱心特效"和"文字特效"中配置
            </p>
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};
