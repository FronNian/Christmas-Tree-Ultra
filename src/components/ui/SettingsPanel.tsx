import React from 'react';
import type { SceneConfig, GestureConfig, GestureAction, MusicConfig } from '../../types';
import { PRESET_MUSIC } from '../../types';
import { isMobile } from '../../utils/helpers';
import { TITLE_FONTS } from './TitleOverlay';
import { 
  TreePine, Sparkles, Heart, Type, X, Settings,
  TreeDeciduous, Lightbulb, Gift, Ribbon, Snowflake, CloudFog, Star, Rainbow, Bot, Hand, Music, Upload
} from 'lucide-react';

// 手势动作选项
const gestureActionOptions: { value: GestureAction; label: string }[] = [
  { value: 'none', label: '无动作' },
  { value: 'formed', label: '聚合' },
  { value: 'chaos', label: '散开' },
  { value: 'heart', label: '爱心' },
  { value: 'text', label: '✨ 文字' },
  { value: 'music', label: '🎵 音乐' },
  { value: 'screenshot', label: '📸 截图' },
  { value: 'reset', label: '🔄 重置' }
];

// 手势名称映射
const gestureNames: Record<keyof GestureConfig, string> = {
  Closed_Fist: '✊ 握拳',
  Open_Palm: '🖐 张开手掌',
  Pointing_Up: '☝️ 食指向上',
  Thumb_Down: '👎 拇指向下',
  Thumb_Up: '👍 拇指向上',
  Victory: '✌️ 剪刀手',
  ILoveYou: '🤟 我爱你'
};

interface SettingsPanelProps {
  config: SceneConfig;
  onChange: (config: SceneConfig) => void;
  onClose: () => void;
  aiEnabled: boolean;
  onAiToggle: (enabled: boolean) => void;
  onAvatarUpload?: (imageUrl: string) => void;  // 头像上传回调
}

export const SettingsPanel = ({ config, onChange, onClose, aiEnabled, onAiToggle, onAvatarUpload }: SettingsPanelProps) => {
  const mobile = isMobile();

  const defaultGestures: GestureConfig = {
    Closed_Fist: 'formed',
    Open_Palm: 'chaos',
    Pointing_Up: 'music',
    Thumb_Down: 'none',
    Thumb_Up: 'screenshot',
    Victory: 'text',
    ILoveYou: 'heart'
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

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: mobile ? '10px' : '60px',
    left: mobile ? '10px' : '20px',
    right: mobile ? '10px' : 'auto',
    zIndex: 20,
    background: 'rgba(0,0,0,0.95)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '8px',
    padding: mobile ? '12px' : '16px',
    width: mobile ? 'auto' : '280px',
    maxHeight: mobile ? '70vh' : '80vh',
    overflowY: 'auto',
    fontFamily: 'sans-serif',
    color: '#fff',
    backdropFilter: 'blur(8px)'
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };

  const sliderStyle: React.CSSProperties = {
    width: '90%',
    accentColor: '#FFD700',
    cursor: 'pointer'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '10px'
  };

  const inputStyle: React.CSSProperties = {
    width: '90%',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    marginTop: '4px'
  };

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#FFD700', display: 'flex', alignItems: 'center', gap: '6px' }}><Settings size={18} /> 场景设置</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
      </div>

      {/* 标题文字 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><TreePine size={14} /> 顶部标题</div>
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
      </div>

      {/* 开场文案 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Type size={14} /> 开场文案</div>
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
      </div>

      {/* 树叶 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><TreeDeciduous size={14} /> 树叶粒子</div>
        <div style={labelStyle}>
          <span>显示树叶</span>
          <input type="checkbox" checked={config.foliage.enabled} onChange={e => onChange({ ...config, foliage: { ...config.foliage, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
      </div>

      {/* 彩灯 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Lightbulb size={14} /> 彩灯</div>
        <div style={labelStyle}>
          <span>显示彩灯</span>
          <input type="checkbox" checked={config.lights.enabled} onChange={e => onChange({ ...config, lights: { ...config.lights, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
      </div>

      {/* 圣诞元素 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Gift size={14} /> 圣诞装饰</div>
        <div style={labelStyle}>
          <span>显示装饰</span>
          <input type="checkbox" checked={config.elements.enabled} onChange={e => onChange({ ...config, elements: { ...config.elements, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
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
      </div>

      {/* 礼物堆 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Gift size={14} /> 树底礼物</div>
        <div style={labelStyle}>
          <span>显示礼物堆</span>
          <input type="checkbox" checked={safeConfig.giftPile.enabled} onChange={e => onChange({ ...config, giftPile: { ...safeConfig.giftPile, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {safeConfig.giftPile.count || 18}</span></div>
        <input type="range" min="5" max="50" step="1" value={safeConfig.giftPile.count || 18} onChange={e => onChange({ ...config, giftPile: { ...safeConfig.giftPile, count: Number(e.target.value) } })} style={sliderStyle} />
      </div>

      {/* 飘落丝带 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Ribbon size={14} /> 飘落丝带</div>
        <div style={labelStyle}>
          <span>显示丝带</span>
          <input type="checkbox" checked={safeConfig.ribbons.enabled} onChange={e => onChange({ ...config, ribbons: { ...safeConfig.ribbons, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {safeConfig.ribbons.count}</span></div>
        <input type="range" min="10" max="100" step="5" value={safeConfig.ribbons.count} onChange={e => onChange({ ...config, ribbons: { ...safeConfig.ribbons, count: Number(e.target.value) } })} style={sliderStyle} />
      </div>

      {/* 雪花 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Snowflake size={14} /> 雪花</div>
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
      </div>

      {/* 底部雾气 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><CloudFog size={14} /> 底部雾气</div>
        <div style={labelStyle}>
          <span>显示雾气</span>
          <input type="checkbox" checked={safeConfig.fog.enabled} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>浓度: {safeConfig.fog.opacity.toFixed(1)}</span></div>
        <input type="range" min="0.1" max="0.8" step="0.05" value={safeConfig.fog.opacity} onChange={e => onChange({ ...config, fog: { ...safeConfig.fog, opacity: Number(e.target.value) } })} style={sliderStyle} />
      </div>

      {/* 闪光 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} /> 闪光粒子</div>
        <div style={labelStyle}>
          <span>显示闪光</span>
          <input type="checkbox" checked={config.sparkles.enabled} onChange={e => onChange({ ...config, sparkles: { ...config.sparkles, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>数量: {config.sparkles.count}</span></div>
        <input type="range" min="100" max="1500" step="50" value={config.sparkles.count} onChange={e => onChange({ ...config, sparkles: { ...config.sparkles, count: Number(e.target.value) } })} style={sliderStyle} />
      </div>

      {/* 星空 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={14} /> 背景星空</div>
        <div style={labelStyle}>
          <span>显示星空</span>
          <input type="checkbox" checked={config.stars.enabled} onChange={e => onChange({ ...config, stars: { enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
      </div>

      {/* 树顶星星/头像 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={14} /> 树顶星星</div>
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
      </div>

      {/* Bloom 效果 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Rainbow size={14} /> 泛光效果</div>
        <div style={labelStyle}>
          <span>开启泛光</span>
          <input type="checkbox" checked={config.bloom.enabled} onChange={e => onChange({ ...config, bloom: { ...config.bloom, enabled: e.target.checked } })} style={{ accentColor: '#FFD700' }} />
        </div>
        <div style={labelStyle}><span>强度: {config.bloom.intensity.toFixed(1)}</span></div>
        <input type="range" min="0.5" max="3" step="0.1" value={config.bloom.intensity} onChange={e => onChange({ ...config, bloom: { ...config.bloom, intensity: Number(e.target.value) } })} style={sliderStyle} />
      </div>

      {/* 背景音乐 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Music size={14} /> 背景音乐</div>
        
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
      </div>

      {/* AI 手势识别 */}
      <div style={sectionStyle}>
        <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Bot size={14} /> AI 手势识别</div>
        <div style={labelStyle}>
          <span>启用 AI</span>
          <input type="checkbox" checked={aiEnabled} onChange={e => onAiToggle(e.target.checked)} style={{ accentColor: '#FFD700' }} />
        </div>
        <p style={{ fontSize: '10px', color: '#666', margin: '4px 0 0 0' }}>
          {isMobile() ? '移动端建议关闭以提升性能' : '需要摄像头权限，用手势控制树'}
        </p>
      </div>

      {/* 手势配置 */}
      {aiEnabled && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Hand size={14} /> 手势配置</div>
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
          <div style={{ marginTop: '12px' }}>
            <div style={{ ...labelStyle, marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Type size={12} /> 文字粒子内容</span>
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
                  gap: '2px'
                }}
              >
                + 添加
              </button>
            </div>
            
            {(config.gestureTexts || [config.gestureText || 'MERRY CHRISTMAS']).map((text, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ color: '#888', fontSize: '10px', width: '16px' }}>{idx + 1}.</span>
                <input
                  type="text"
                  value={text}
                  onChange={e => {
                    const texts = [...(config.gestureTexts || [config.gestureText || 'MERRY CHRISTMAS'])];
                    texts[idx] = e.target.value;
                    onChange({ ...config, gestureTexts: texts, gestureText: texts[0] });
                  }}
                  placeholder="输入文字（支持大小写英文）"
                  maxLength={20}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px'
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
                      fontSize: '14px'
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
            <div style={{ ...titleStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} /> 特效配置</div>
            
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

            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={12} /> 爱心粒子数量: {config.gestureEffect?.heartCount || 1500}</span>
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

            <div style={{ ...labelStyle, marginTop: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Type size={12} /> 文字粒子数量: {config.gestureEffect?.textCount || 1000}</span>
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
          </div>
        </div>
      )}
    </div>
  );
};
