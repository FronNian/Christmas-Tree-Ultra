import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { BellConfig, ShootingStarsConfig, AuroraConfig, FireworksConfig, MusicWavesConfig } from '../../types';
import { 
  DEFAULT_BELL_CONFIG, 
  DEFAULT_SHOOTING_STARS_CONFIG, 
  DEFAULT_AURORA_CONFIG, 
  DEFAULT_FIREWORKS_CONFIG,
  DEFAULT_MUSIC_WAVES_CONFIG
} from '../../config';
import { Bell, Sparkles, Sun, Flame, Waves, ChevronDown, ChevronRight } from 'lucide-react';

// 预设颜色
const PRESET_COLORS = [
  '#FF0000', '#FF4500', '#FF1493', '#FFD700', '#FFA500',
  '#00FF00', '#00FF88', '#2E7D32', '#00FFFF', '#1E90FF',
  '#0000FF', '#9C27B0', '#8B00FF', '#FFFFFF', '#9E9E9E',
  '#000000',
];

// 颜色选择器组件
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  const calculatePosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left;
    if (left + 160 > vw - 10) left = vw - 170;
    if (left < 10) left = 10;
    let top = rect.bottom + 4;
    if (top + 240 > vh - 10) top = rect.top - 244;
    if (top < 10) top = 10;
    setPopupPosition({ top, left });
  }, []);
  
  React.useEffect(() => {
    if (isOpen) calculatePosition();
  }, [isOpen, calculatePosition]);
  
  const handleInputChange = (v: string) => {
    setInputValue(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
  };
  
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && !buttonRef.current.contains(target) &&
          popupRef.current && !popupRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
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
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '32px',
          cursor: 'pointer',
          borderRadius: '4px',
          border: '2px solid rgba(255,255,255,0.3)',
          background: value,
          padding: 0
        }}
      />
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            width: '160px',
            zIndex: 10000,
            padding: '8px',
            background: 'rgba(20, 20, 20, 0.98)',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,215,0,0.3)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '8px' }}>
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { onChange(color); setInputValue(color); }}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: color,
                  border: value === color ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  padding: 0,
                  minHeight: '28px'
                }}
              />
            ))}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value.toUpperCase())}
            placeholder="#FFFFFF"
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '12px',
              marginBottom: '8px',
              boxSizing: 'border-box'
            }}
          />
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

// 可折叠区域
interface CollapsibleProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Collapsible: React.FC<CollapsibleProps> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: isOpen ? '12px' : '0' }}>
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
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{icon}{title}</span>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && <div style={{ paddingTop: '8px' }}>{children}</div>}
    </div>
  );
};

interface VisualEnhancementsSettingsProps {
  bells?: BellConfig;
  shootingStars?: ShootingStarsConfig;
  aurora?: AuroraConfig;
  fireworks?: FireworksConfig;
  musicWaves?: MusicWavesConfig;
  onBellsChange: (config: BellConfig) => void;
  onShootingStarsChange: (config: ShootingStarsConfig) => void;
  onAuroraChange: (config: AuroraConfig) => void;
  onFireworksChange: (config: FireworksConfig) => void;
  onMusicWavesChange: (config: MusicWavesConfig) => void;
}

export const VisualEnhancementsSettings: React.FC<VisualEnhancementsSettingsProps> = ({
  bells,
  shootingStars,
  aurora,
  fireworks,
  musicWaves,
  onBellsChange,
  onShootingStarsChange,
  onAuroraChange,
  onFireworksChange,
  onMusicWavesChange
}) => {
  const bellConfig = { ...DEFAULT_BELL_CONFIG, ...bells };
  const starsConfig = { ...DEFAULT_SHOOTING_STARS_CONFIG, ...shootingStars };
  const auroraConfig = { ...DEFAULT_AURORA_CONFIG, ...aurora };
  const fireworksConfig = { ...DEFAULT_FIREWORKS_CONFIG, ...fireworks };
  const musicWavesConfig = { ...DEFAULT_MUSIC_WAVES_CONFIG, ...musicWaves };
  
  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };
  
  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: '#FFD700',
    cursor: 'pointer'
  };

  return (
    <>
      {/* 3D 铃铛 */}
      <Collapsible title="3D 铃铛" icon={<Bell size={14} />}>
        <div style={labelStyle}>
          <span>显示铃铛</span>
          <input
            type="checkbox"
            checked={bellConfig.enabled}
            onChange={e => onBellsChange({ ...bellConfig, enabled: e.target.checked })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        {bellConfig.enabled && (
          <>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>数量: {bellConfig.count}</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              value={bellConfig.count}
              onChange={e => onBellsChange({ ...bellConfig, count: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>大小: {bellConfig.size.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={bellConfig.size}
              onChange={e => onBellsChange({ ...bellConfig, size: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>铃铛颜色</span>
              <ColorPicker
                value={bellConfig.color}
                onChange={color => onBellsChange({ ...bellConfig, color })}
              />
            </div>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>摆动幅度: {bellConfig.swingAmplitude.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.5"
              step="0.05"
              value={bellConfig.swingAmplitude}
              onChange={e => onBellsChange({ ...bellConfig, swingAmplitude: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>摆动速度: {bellConfig.swingSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={bellConfig.swingSpeed}
              onChange={e => onBellsChange({ ...bellConfig, swingSpeed: Number(e.target.value) })}
              style={sliderStyle}
            />
          </>
        )}
      </Collapsible>

      {/* 流星效果 */}
      <Collapsible title="流星效果" icon={<Sparkles size={14} />}>
        <div style={labelStyle}>
          <span>显示流星</span>
          <input
            type="checkbox"
            checked={starsConfig.enabled}
            onChange={e => onShootingStarsChange({ ...starsConfig, enabled: e.target.checked })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        {starsConfig.enabled && (
          <>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>出现间隔: {starsConfig.frequency[0]}-{starsConfig.frequency[1]}秒</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="range"
                min="1"
                max="10"
                value={starsConfig.frequency[0]}
                onChange={e => onShootingStarsChange({ 
                  ...starsConfig, 
                  frequency: [Number(e.target.value), starsConfig.frequency[1]] 
                })}
                style={{ ...sliderStyle, flex: 1 }}
              />
              <input
                type="range"
                min="5"
                max="20"
                value={starsConfig.frequency[1]}
                onChange={e => onShootingStarsChange({ 
                  ...starsConfig, 
                  frequency: [starsConfig.frequency[0], Number(e.target.value)] 
                })}
                style={{ ...sliderStyle, flex: 1 }}
              />
            </div>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>速度: {starsConfig.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={starsConfig.speed}
              onChange={e => onShootingStarsChange({ ...starsConfig, speed: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>拖尾长度: {starsConfig.trailLength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={starsConfig.trailLength}
              onChange={e => onShootingStarsChange({ ...starsConfig, trailLength: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>流星颜色</span>
              <ColorPicker
                value={starsConfig.color}
                onChange={color => onShootingStarsChange({ ...starsConfig, color })}
              />
            </div>
          </>
        )}
      </Collapsible>

      {/* 极光背景 */}
      <Collapsible title="极光背景" icon={<Sun size={14} />}>
        <div style={labelStyle}>
          <span>显示极光</span>
          <input
            type="checkbox"
            checked={auroraConfig.enabled}
            onChange={e => onAuroraChange({ ...auroraConfig, enabled: e.target.checked })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        {auroraConfig.enabled && (
          <>
            <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
              三色渐变极光效果
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '9px', color: '#888' }}>颜色1</span>
                <ColorPicker
                  value={auroraConfig.colors[0]}
                  onChange={color => onAuroraChange({ 
                    ...auroraConfig, 
                    colors: [color, auroraConfig.colors[1], auroraConfig.colors[2]] 
                  })}
                />
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#888' }}>颜色2</span>
                <ColorPicker
                  value={auroraConfig.colors[1]}
                  onChange={color => onAuroraChange({ 
                    ...auroraConfig, 
                    colors: [auroraConfig.colors[0], color, auroraConfig.colors[2]] 
                  })}
                />
              </div>
              <div>
                <span style={{ fontSize: '9px', color: '#888' }}>颜色3</span>
                <ColorPicker
                  value={auroraConfig.colors[2]}
                  onChange={color => onAuroraChange({ 
                    ...auroraConfig, 
                    colors: [auroraConfig.colors[0], auroraConfig.colors[1], color] 
                  })}
                />
              </div>
            </div>
            <div style={{ ...labelStyle, marginTop: '10px' }}>
              <span>亮度: {auroraConfig.intensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.1"
              value={auroraConfig.intensity}
              onChange={e => onAuroraChange({ ...auroraConfig, intensity: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>波动速度: {auroraConfig.waveSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={auroraConfig.waveSpeed}
              onChange={e => onAuroraChange({ ...auroraConfig, waveSpeed: Number(e.target.value) })}
              style={sliderStyle}
            />
          </>
        )}
      </Collapsible>

      {/* 烟花效果 */}
      <Collapsible title="烟花效果" icon={<Flame size={14} />}>
        <div style={labelStyle}>
          <span>启用烟花</span>
          <input
            type="checkbox"
            checked={fireworksConfig.enabled}
            onChange={e => onFireworksChange({ ...fireworksConfig, enabled: e.target.checked })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        {fireworksConfig.enabled && (
          <>
            <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
              通过手势或按钮触发烟花
            </p>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>爆炸大小: {fireworksConfig.explosionSize}</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              value={fireworksConfig.explosionSize}
              onChange={e => onFireworksChange({ ...fireworksConfig, explosionSize: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>粒子数量: {fireworksConfig.particleCount}</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={fireworksConfig.particleCount}
              onChange={e => onFireworksChange({ ...fireworksConfig, particleCount: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>最大同时数: {fireworksConfig.maxConcurrent}</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={fireworksConfig.maxConcurrent}
              onChange={e => onFireworksChange({ ...fireworksConfig, maxConcurrent: Number(e.target.value) })}
              style={sliderStyle}
            />
          </>
        )}
      </Collapsible>

      {/* 音乐波浪线（地面光轨） */}
      <Collapsible title="音乐波浪线" icon={<Waves size={14} />}>
        <div style={labelStyle}>
          <span>启用波浪线</span>
          <input
            type="checkbox"
            checked={musicWavesConfig.enabled}
            onChange={e => onMusicWavesChange({ ...musicWavesConfig, enabled: e.target.checked })}
            style={{ accentColor: '#FFD700' }}
          />
        </div>
        {musicWavesConfig.enabled && (
          <>
            <p style={{ fontSize: '10px', color: '#888', margin: '0 0 8px 0' }}>
              随音乐节奏跳动的地面光轨效果
            </p>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>主颜色</span>
              <ColorPicker
                value={musicWavesConfig.color || '#FFD700'}
                onChange={color => onMusicWavesChange({ ...musicWavesConfig, color })}
              />
            </div>
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: '#888' }}>次要颜色</span>
              <ColorPicker
                value={musicWavesConfig.secondaryColor || '#FFFFFF'}
                onChange={color => onMusicWavesChange({ ...musicWavesConfig, secondaryColor: color })}
              />
            </div>
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>线条数量: {musicWavesConfig.lineCount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="6"
              value={musicWavesConfig.lineCount}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, lineCount: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>基础半径: {musicWavesConfig.radius}</span>
            </div>
            <input
              type="range"
              min="8"
              max="20"
              step="0.5"
              value={musicWavesConfig.radius}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, radius: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>线宽: {musicWavesConfig.width.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.03"
              max="0.15"
              step="0.01"
              value={musicWavesConfig.width}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, width: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>基础振幅: {musicWavesConfig.baseAmplitude.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={musicWavesConfig.baseAmplitude}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, baseAmplitude: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>音乐响应强度: {musicWavesConfig.musicStrength.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={musicWavesConfig.musicStrength}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, musicStrength: Number(e.target.value) })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span>流动速度: {musicWavesConfig.speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={musicWavesConfig.speed}
              onChange={e => onMusicWavesChange({ ...musicWavesConfig, speed: Number(e.target.value) })}
              style={sliderStyle}
            />
          </>
        )}
      </Collapsible>
    </>
  );
};
