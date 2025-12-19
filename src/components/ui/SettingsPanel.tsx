import React, { useState } from 'react';
import type { SceneConfig, GestureConfig, GestureAction, MusicConfig, AnimationEasing, ScatterShape, GatherShape, DecorationColors } from '../../types';
import { PRESET_MUSIC } from '../../types';
import { isMobile } from '../../utils/helpers';
import { TITLE_FONTS } from './TitleOverlay';
import { TimelineEditor } from './TimelineEditor';
import { 
  TreePine, Sparkles, Heart, Type, X, Settings,
  TreeDeciduous, Lightbulb, Gift, Ribbon, Snowflake, CloudFog, Star, Rainbow, Bot, Hand, Music, Upload, Zap, Palette,
  ChevronDown, ChevronRight, Film, Image
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
  { value: 'zoomOut', label: '🔎 缩小' }
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
  onTimelinePreview?: () => void;  // 时间轴预览回调
  isTimelinePlaying?: boolean;  // 时间轴是否正在播放
}

export const SettingsPanel = ({ 
  config, onChange, onClose, aiEnabled, onAiToggle, onAvatarUpload,
  photoCount = 0, onTimelinePreview, isTimelinePlaying = false
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
    music: config.music || defaultMusic
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
            <input
              type="color"
              value={config.title?.color || '#FFD700'}
              onChange={e => onChange({ ...config, title: { ...safeConfig.title, color: e.target.value } })}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: '#888' }}>发光颜色</span>
            <input
              type="color"
              value={config.title?.shadowColor || config.title?.color || '#FFD700'}
              onChange={e => onChange({ ...config, title: { ...safeConfig.title, shadowColor: e.target.value } })}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
          configuredTexts={config.gestureTexts || (config.gestureText ? [config.gestureText] : [])}
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
                <input
                  type="color"
                  value={config.foliage.color || '#00FF88'}
                  onChange={e => onChange({ ...config, foliage: { ...config.foliage, color: e.target.value } })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>散开颜色</span>
                <input
                  type="color"
                  value={config.foliage.chaosColor || '#004422'}
                  onChange={e => onChange({ ...config, foliage: { ...config.foliage, chaosColor: e.target.value } })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
                <input
                  type="color"
                  value={config.lights.colors?.[key] || ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'][idx]}
                  onChange={e => onChange({
                    ...config,
                    lights: {
                      ...config.lights,
                      colors: {
                        color1: config.lights.colors?.color1 || '#FF0000',
                        color2: config.lights.colors?.color2 || '#00FF00',
                        color3: config.lights.colors?.color3 || '#0000FF',
                        color4: config.lights.colors?.color4 || '#FFFF00',
                        [key]: e.target.value
                      }
                    }
                  })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
              </div>
            ))}
          </div>
          {/* 颜色预览 */}
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
        
        {/* 装饰类型开关 */}
        <p style={{ fontSize: '10px', color: '#888', margin: '8px 0 6px 0' }}>
          装饰类型（关闭后由其他类型替代）
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
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
            🎁 礼物盒
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
            🔴 球体
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
            🍬 糖果棒
          </label>
        </div>
        
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
              <input
                type="color"
                value={config.elements.colors?.primary || DEFAULT_DECORATION_COLORS.primary}
                onChange={e => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      primary: e.target.value 
                    } 
                  }
                })}
                style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>次色</span>
              <input
                type="color"
                value={config.elements.colors?.secondary || DEFAULT_DECORATION_COLORS.secondary}
                onChange={e => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      secondary: e.target.value 
                    } 
                  }
                })}
                style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>强调色</span>
              <input
                type="color"
                value={config.elements.colors?.accent || DEFAULT_DECORATION_COLORS.accent}
                onChange={e => onChange({
                  ...config,
                  elements: { 
                    ...config.elements, 
                    colors: { 
                      ...DEFAULT_DECORATION_COLORS,
                      ...config.elements.colors, 
                      accent: e.target.value 
                    } 
                  }
                })}
                style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
              />
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#888' }}>糖果色</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="color"
                  value={config.elements.colors?.candy1 || DEFAULT_DECORATION_COLORS.candy1}
                  onChange={e => onChange({
                    ...config,
                    elements: { 
                      ...config.elements, 
                      colors: { 
                        ...DEFAULT_DECORATION_COLORS,
                        ...config.elements.colors, 
                        candy1: e.target.value 
                      } 
                    }
                  })}
                  style={{ flex: 1, height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
                <input
                  type="color"
                  value={config.elements.colors?.candy2 || DEFAULT_DECORATION_COLORS.candy2}
                  onChange={e => onChange({
                    ...config,
                    elements: { 
                      ...config.elements, 
                      colors: { 
                        ...DEFAULT_DECORATION_COLORS,
                        ...config.elements.colors, 
                        candy2: e.target.value 
                      } 
                    }
                  })}
                  style={{ flex: 1, height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
          <input
            type="color"
            value={config.photoOrnaments?.frameColor || '#FFFFFF'}
            onChange={e => onChange({ 
              ...config, 
              photoOrnaments: { 
                ...config.photoOrnaments, 
                frameColor: e.target.value 
              } 
            })}
            style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '4px' }}
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
                <input
                  type="color"
                  value={config.spiralRibbon?.color || '#FF2222'}
                  onChange={e => onChange({
                    ...config,
                    spiralRibbon: { ...config.spiralRibbon!, color: e.target.value }
                  })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#888' }}>发光颜色</span>
                <input
                  type="color"
                  value={config.spiralRibbon?.glowColor || '#FF4444'}
                  onChange={e => onChange({
                    ...config,
                    spiralRibbon: { ...config.spiralRibbon!, glowColor: e.target.value }
                  })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
              <input
                type="color"
                value={config.glowingStreaks?.color || '#FFD700'}
                onChange={e => onChange({
                  ...config,
                  glowingStreaks: { ...config.glowingStreaks!, color: e.target.value }
                })}
                style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
              <input
                key={idx}
                type="color"
                value={(config.giftPile?.colors || ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'])[idx]}
                onChange={e => {
                  const newColors = [...(config.giftPile?.colors || ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'])];
                  newColors[idx] = e.target.value;
                  onChange({ ...config, giftPile: { ...safeConfig.giftPile, colors: newColors } });
                }}
                style={{ width: '100%', height: '24px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
              <input
                key={idx}
                type="color"
                value={(config.ribbons?.colors || ['#FFD700', '#D32F2F', '#ECEFF1', '#FF69B4', '#00CED1'])[idx]}
                onChange={e => {
                  const newColors = [...(config.ribbons?.colors || ['#FFD700', '#D32F2F', '#ECEFF1', '#FF69B4', '#00CED1'])];
                  newColors[idx] = e.target.value;
                  onChange({ ...config, ribbons: { ...safeConfig.ribbons, colors: newColors } });
                }}
                style={{ width: '100%', height: '24px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
        <div style={labelStyle}><span>浓度: {safeConfig.fog.opacity.toFixed(1)}</span></div>
        <input type="range" min="0.1" max="0.8" step="0.05" value={safeConfig.fog.opacity} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, opacity: Number(e.target.value) } })} style={sliderStyle} />
        <div style={{ marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: '#888' }}>雾气颜色</span>
          <input
            type="color"
            value={config.fog?.color || '#ffffff'}
            onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, color: e.target.value } })}
            style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '4px' }}
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
          <input
            type="color"
            value={config.background?.color || '#000300'}
            onChange={e => onChange({ ...config, background: { color: e.target.value } })}
            style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px', marginTop: '4px' }}
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
          <input
            type="color"
            value={config.heartEffect?.color || '#FF1493'}
            onChange={e => onChange({ ...config, heartEffect: { ...config.heartEffect, color: e.target.value } })}
            style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
            <input
              type="color"
              value={config.heartEffect?.frameColor || '#FFFFFF'}
              onChange={e => onChange({ 
                ...config, 
                heartEffect: { 
                  ...config.heartEffect, 
                  color: config.heartEffect?.color || '#FF1493',
                  frameColor: e.target.value 
                } 
              })}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
                <input
                  type="color"
                  value={config.heartEffect?.glowTrail?.color || config.heartEffect?.color || '#FF1493'}
                  onChange={e => onChange({ 
                    ...config, 
                    heartEffect: { 
                      ...config.heartEffect, 
                      color: config.heartEffect?.color || '#FF1493',
                      glowTrail: { 
                        ...config.heartEffect?.glowTrail, 
                        enabled: config.heartEffect?.glowTrail?.enabled ?? true,
                        color: e.target.value 
                      } 
                    } 
                  })}
                  style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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
      </CollapsibleSection>
      
      {/* 文字特效 */}
      <CollapsibleSection title="文字特效" icon={<Type size={14} />}>
        <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
          手势或故事线触发的文字效果
        </p>
        
        {/* 文字颜色 */}
        <div>
          <span style={{ fontSize: '10px', color: '#888' }}>文字颜色</span>
          <input
            type="color"
            value={config.textEffect?.color || '#FFD700'}
            onChange={e => onChange({ ...config, textEffect: { ...config.textEffect, color: e.target.value } })}
            style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
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

      {/* AI 手势识别 */}
      <CollapsibleSection title="AI 手势识别" icon={<Bot size={14} />}>
        <div style={labelStyle}>
          <span>启用 AI</span>
          <input type="checkbox" checked={aiEnabled} onChange={e => onAiToggle(e.target.checked)} style={{ accentColor: '#FFD700' }} />
        </div>
        <p style={{ fontSize: '10px', color: '#666', margin: '4px 0 0 0' }}>
          {isMobile() ? '移动端建议关闭以提升性能' : '需要摄像头权限，用手势控制树'}
        </p>
      </CollapsibleSection>

      {/* 手势配置 */}
      {aiEnabled && (
        <CollapsibleSection title="手势配置" icon={<Hand size={14} />}>
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
          
          {/* 文字粒子内容 - 多条轮播 */}
          <div style={{ marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ ...labelStyle, marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><Type size={12} /> 文字粒子内容</span>
              <button
                onClick={() => {
                  const texts = config.gestureTexts || [config.gestureText || 'MERRY CHRISTMAS'];
                  onChange({ ...config, gestureTexts: [...texts, 'NEW TEXT'] });
                }}
                style={{
                  background: 'rgba(255,215,0,0.2)',
                  border: '1px solid rgba(255,215,0,0.5)',
                  color: '#FFD700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0
                }}
              >
                + 添加
              </button>
            </div>
            
            {(config.gestureTexts || [config.gestureText || 'MERRY CHRISTMAS']).map((text, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
                <span style={{ color: '#888', fontSize: '10px', width: '16px', flexShrink: 0 }}>{idx + 1}.</span>
                <input
                  type="text"
                  value={text}
                  onChange={e => {
                    const texts = [...(config.gestureTexts || [config.gestureText || 'MERRY CHRISTMAS'])];
                    texts[idx] = e.target.value;
                    onChange({ ...config, gestureTexts: texts, gestureText: texts[0] });
                  }}
                  placeholder="输入文字"
                  maxLength={20}
                  style={{
                    flex: 1,
                    minWidth: 0, // 关键：允许 flex 子元素收缩
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                />
                {(config.gestureTexts?.length || 1) > 1 && (
                  <button
                    onClick={() => {
                      const texts = [...(config.gestureTexts || [])];
                      texts.splice(idx, 1);
                      onChange({ ...config, gestureTexts: texts, gestureText: texts[0] });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6666',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '14px',
                      flexShrink: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            
            {/* 切换间隔 */}
            {(config.gestureTexts?.length || 1) > 1 && (
              <div style={{ marginTop: '8px' }}>
                <div style={labelStyle}>
                  <span>切换间隔: {config.textSwitchInterval || 3}秒</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={config.textSwitchInterval || 3}
                  onChange={e => onChange({ ...config, textSwitchInterval: Number(e.target.value) })}
                  style={sliderStyle}
                />
              </div>
            )}
            
            <p style={{ fontSize: '9px', color: '#666', margin: '6px 0 0 0' }}>
              支持英文大小写字母、数字 0-9、空格和 ! · 剪刀手触发
            </p>
            
            {/* 分享时先显示文字 */}
            <div style={{ ...labelStyle, marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
