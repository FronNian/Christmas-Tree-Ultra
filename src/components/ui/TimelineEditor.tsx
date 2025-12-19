/**
 * 时间轴编辑器组件
 * 用于配置故事线模式的步骤
 */
import React, { useState } from 'react';
import type { TimelineConfig, TimelineStep, TimelineStepType } from '../../types';
import { PRESET_MUSIC } from '../../types';
import { 
  Play, Pause, Trash2, GripVertical, ChevronUp, ChevronDown,
  MessageSquare, Image, Heart, Type, TreePine, Music
} from 'lucide-react';

// 生成唯一ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// 步骤类型配置
const STEP_TYPES: { type: TimelineStepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'intro', label: '开场文案', icon: <MessageSquare size={14} />, color: '#9C27B0' },
  { type: 'photo', label: '照片展示', icon: <Image size={14} />, color: '#2196F3' },
  { type: 'heart', label: '爱心特效', icon: <Heart size={14} />, color: '#E91E63' },
  { type: 'text', label: '文字特效', icon: <Type size={14} />, color: '#FF9800' },
  { type: 'tree', label: '圣诞树', icon: <TreePine size={14} />, color: '#4CAF50' },
];

// 文字动画选项
const TEXT_ANIMATIONS = [
  { id: 'auto', label: '自动（英文粒子/中文发光）' },
  { id: 'particle', label: '✨ 粒子效果（仅英文）' },
  { id: 'glow', label: '💫 发光脉冲' },
  { id: 'sparkle', label: '⭐ 闪烁星光' },
  { id: 'wave', label: '🌊 波浪' },
  { id: 'bounce', label: '🎾 弹跳' },
  { id: 'gradient', label: '🌈 渐变流动' },
  { id: 'neon', label: '💡 霓虹灯' },
  { id: 'typewriter', label: '⌨️ 打字机' },
  { id: 'fadeIn', label: '🌅 淡入' },
];

// 创建默认步骤
const createDefaultStep = (type: TimelineStepType): TimelineStep => {
  const base = { id: generateId(), duration: 3000, delay: 0 };
  
  switch (type) {
    case 'intro':
      return { ...base, type: 'intro', text: '献给最特别的你', subText: '' };
    case 'photo':
      return { ...base, type: 'photo', photoIndex: -1 }; // -1 表示按顺序
    case 'heart':
      return { ...base, type: 'heart', duration: 4000, showPhoto: true, photoIndex: -1 };
    case 'text':
      return { ...base, type: 'text', text: 'MERRY CHRISTMAS' };
    case 'tree':
      return { ...base, type: 'tree', duration: 2000 };
  }
};

interface TimelineEditorProps {
  config: TimelineConfig | undefined;
  onChange: (config: TimelineConfig) => void;
  photoCount: number;
  configuredTexts?: string[];  // 已配置的文字粒子内容
  onPreview?: () => void;
  isPlaying?: boolean;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  config,
  onChange,
  photoCount,
  configuredTexts = [],
  onPreview,
  isPlaying = false
}) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // 初始化默认配置
  const safeConfig: TimelineConfig = config || {
    enabled: false,
    autoPlay: true,
    loop: false,
    steps: []
  };

  // 更新配置
  const updateConfig = (updates: Partial<TimelineConfig>) => {
    onChange({ ...safeConfig, ...updates });
  };

  // 添加步骤
  const addStep = (type: TimelineStepType) => {
    const newStep = createDefaultStep(type);
    updateConfig({ steps: [...safeConfig.steps, newStep] });
    setExpandedStep(newStep.id);
  };

  // 删除步骤
  const removeStep = (id: string) => {
    updateConfig({ steps: safeConfig.steps.filter(s => s.id !== id) });
    if (expandedStep === id) setExpandedStep(null);
  };

  // 更新步骤
  const updateStep = (id: string, updates: Partial<TimelineStep>) => {
    updateConfig({
      steps: safeConfig.steps.map(s => 
        s.id === id ? { ...s, ...updates } as TimelineStep : s
      )
    });
  };

  // 移动步骤
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= safeConfig.steps.length) return;
    
    const newSteps = [...safeConfig.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    updateConfig({ steps: newSteps });
  };

  // 计算总时长
  const totalDuration = safeConfig.steps.reduce((sum, s) => sum + s.duration + (s.delay || 0), 0);

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px'
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    boxSizing: 'border-box'
  };

  return (
    <div>
      {/* 启用开关 */}
      <div style={labelStyle}>
        <span>启用故事线模式</span>
        <input
          type="checkbox"
          checked={safeConfig.enabled}
          onChange={e => updateConfig({ enabled: e.target.checked })}
          style={{ accentColor: '#FFD700' }}
        />
      </div>
      
      {safeConfig.enabled && (
        <>
          <p style={{ fontSize: '10px', color: '#888', margin: '0 0 12px 0' }}>
            故事线模式会按顺序播放特效，最后以圣诞树结束。
            启用后将忽略"开场文案"和"预加载文字"等单独配置。
          </p>

          {/* 播放选项 */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={safeConfig.autoPlay}
                onChange={e => updateConfig({ autoPlay: e.target.checked })}
                style={{ accentColor: '#FFD700' }}
              />
              自动播放
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <input
                type="checkbox"
                checked={safeConfig.loop}
                onChange={e => updateConfig({ loop: e.target.checked })}
                style={{ accentColor: '#FFD700' }}
              />
              循环播放
            </label>
          </div>

          {/* 故事线专用音乐 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '6px' }}>
              <Music size={12} /> 故事线音乐
            </label>
            <select
              value={safeConfig.music || ''}
              onChange={e => updateConfig({ music: e.target.value || undefined })}
              style={inputStyle}
            >
              <option value="">使用全局音乐设置</option>
              {PRESET_MUSIC.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
              播放故事线时自动切换到此音乐
            </p>
          </div>

          {/* 预览按钮 */}
          {onPreview && safeConfig.steps.length > 0 && (
            <button
              onClick={onPreview}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '12px',
                background: isPlaying ? '#E91E63' : 'rgba(255,215,0,0.2)',
                border: '1px solid #FFD700',
                borderRadius: '4px',
                color: '#FFD700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {isPlaying ? <><Pause size={14} /> 停止预览</> : <><Play size={14} /> 预览故事线</>}
            </button>
          )}

          {/* 总时长 */}
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>
            总时长: {(totalDuration / 1000).toFixed(1)} 秒 | {safeConfig.steps.length} 个步骤
          </div>

          {/* 步骤列表 */}
          <div style={{ marginBottom: '12px' }}>
            {safeConfig.steps.map((step, index) => {
              const stepType = STEP_TYPES.find(t => t.type === step.type);
              const isExpanded = expandedStep === step.id;
              
              return (
                <div
                  key={step.id}
                  style={{
                    marginBottom: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    border: `1px solid ${stepType?.color || '#666'}40`,
                    overflow: 'hidden'
                  }}
                >
                  {/* 步骤头部 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'
                    }}
                    onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                  >
                    <GripVertical size={14} style={{ color: '#666', marginRight: '6px' }} />
                    <span style={{ 
                      color: stepType?.color, 
                      marginRight: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {stepType?.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: '12px' }}>
                      {index + 1}. {stepType?.label}
                    </span>
                    <span style={{ fontSize: '10px', color: '#888', marginRight: '8px' }}>
                      {(step.duration / 1000).toFixed(1)}s
                    </span>
                    
                    {/* 移动按钮 */}
                    <button
                      onClick={e => { e.stopPropagation(); moveStep(index, 'up'); }}
                      disabled={index === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: index === 0 ? '#444' : '#888',
                        cursor: index === 0 ? 'default' : 'pointer',
                        padding: '2px'
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); moveStep(index, 'down'); }}
                      disabled={index === safeConfig.steps.length - 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: index === safeConfig.steps.length - 1 ? '#444' : '#888',
                        cursor: index === safeConfig.steps.length - 1 ? 'default' : 'pointer',
                        padding: '2px'
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); removeStep(step.id); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff6666',
                        cursor: 'pointer',
                        padding: '2px',
                        marginLeft: '4px'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 步骤详情 */}
                  {isExpanded && (
                    <div style={{ padding: '8px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* 通用配置 */}
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '10px', color: '#888' }}>
                          持续时间: {(step.duration / 1000).toFixed(1)} 秒
                        </label>
                        <input
                          type="range"
                          min="1000"
                          max="10000"
                          step="500"
                          value={step.duration}
                          onChange={e => updateStep(step.id, { duration: Number(e.target.value) })}
                          style={{ width: '100%', accentColor: stepType?.color }}
                        />
                      </div>

                      {/* 类型特定配置 */}
                      {step.type === 'intro' && (
                        <>
                          <input
                            type="text"
                            value={step.text}
                            onChange={e => updateStep(step.id, { text: e.target.value })}
                            placeholder="主文案"
                            style={{ ...inputStyle, marginBottom: '6px' }}
                          />
                          <input
                            type="text"
                            value={step.subText || ''}
                            onChange={e => updateStep(step.id, { subText: e.target.value })}
                            placeholder="副文案（可选）"
                            style={inputStyle}
                          />
                        </>
                      )}

                      {step.type === 'photo' && (
                        <div>
                          <label style={{ fontSize: '10px', color: '#888' }}>选择照片</label>
                          <select
                            value={step.photoIndex}
                            onChange={e => updateStep(step.id, { photoIndex: Number(e.target.value) })}
                            style={{ ...inputStyle, marginTop: '4px' }}
                          >
                            <option value={-1}>按顺序自动选择</option>
                            {Array.from({ length: photoCount }, (_, i) => (
                              <option key={i} value={i}>照片 {i + 1}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {step.type === 'heart' && (
                        <>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '8px' }}>
                            <input
                              type="checkbox"
                              checked={step.showPhoto ?? false}
                              onChange={e => updateStep(step.id, { showPhoto: e.target.checked })}
                              style={{ accentColor: '#E91E63' }}
                            />
                            在爱心中心显示照片
                          </label>
                          {step.showPhoto && (
                            <div>
                              <label style={{ fontSize: '10px', color: '#888' }}>选择照片</label>
                              <select
                                value={step.photoIndex ?? -1}
                                onChange={e => updateStep(step.id, { photoIndex: Number(e.target.value) })}
                                style={{ ...inputStyle, marginTop: '4px' }}
                              >
                                <option value={-1}>按顺序自动选择</option>
                                {Array.from({ length: photoCount }, (_, i) => (
                                  <option key={i} value={i}>照片 {i + 1}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      )}

                      {step.type === 'text' && (
                        <div>
                          {/* 使用已配置文字选项 */}
                          {configuredTexts.length > 0 && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginBottom: '8px' }}>
                              <input
                                type="checkbox"
                                checked={step.useConfiguredText ?? false}
                                onChange={e => updateStep(step.id, { useConfiguredText: e.target.checked })}
                                style={{ accentColor: '#FF9800' }}
                              />
                              使用已配置的文字粒子内容
                            </label>
                          )}
                          
                          {step.useConfiguredText && configuredTexts.length > 0 ? (
                            <div style={{ padding: '8px', background: 'rgba(255,152,0,0.1)', borderRadius: '4px', fontSize: '11px' }}>
                              <p style={{ margin: '0 0 4px 0', color: '#FF9800' }}>将使用以下已配置文字：</p>
                              {configuredTexts.map((t, i) => (
                                <div key={i} style={{ color: '#ccc', padding: '2px 0' }}>• {t}</div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <label style={{ fontSize: '10px', color: '#888' }}>显示文字</label>
                              <input
                                type="text"
                                value={step.text}
                                onChange={e => updateStep(step.id, { text: e.target.value })}
                                placeholder="圣诞快乐 / MERRY CHRISTMAS"
                                maxLength={30}
                                style={{ ...inputStyle, marginTop: '4px' }}
                              />
                            </>
                          )}
                          
                          <label style={{ fontSize: '10px', color: '#888', marginTop: '8px', display: 'block' }}>
                            动画效果
                          </label>
                          <select
                            value={step.animation || 'auto'}
                            onChange={e => updateStep(step.id, { animation: e.target.value === 'auto' ? undefined : e.target.value as never })}
                            style={{ ...inputStyle, marginTop: '4px' }}
                          >
                            {TEXT_ANIMATIONS.map(a => (
                              <option key={a.id} value={a.id}>{a.label}</option>
                            ))}
                          </select>
                          <p style={{ fontSize: '9px', color: '#666', margin: '4px 0 0 0' }}>
                            粒子效果仅支持英文，中文会自动使用CSS动画
                          </p>
                        </div>
                      )}

                      {step.type === 'tree' && (
                        <p style={{ fontSize: '10px', color: '#888', margin: 0 }}>
                          圣诞树聚合是故事线的结束标志
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 添加步骤按钮 */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px',
            padding: '8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px'
          }}>
            <span style={{ fontSize: '10px', color: '#888', width: '100%', marginBottom: '4px' }}>
              添加步骤:
            </span>
            {STEP_TYPES.map(({ type, label, icon, color }) => (
              <button
                key={type}
                onClick={() => addStep(type)}
                style={{
                  padding: '6px 10px',
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  borderRadius: '4px',
                  color: color,
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* 快速模板 */}
          <div style={{ marginTop: '12px' }}>
            <span style={{ fontSize: '10px', color: '#888' }}>快速模板:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  const steps: TimelineStep[] = [
                    { id: generateId(), type: 'intro', duration: 3000, text: '献给最特别的你' },
                    ...Array.from({ length: Math.min(3, photoCount) }, (_, i) => ({
                      id: generateId(),
                      type: 'photo' as const,
                      duration: 2500,
                      photoIndex: i
                    })),
                    { id: generateId(), type: 'heart', duration: 4000, showPhoto: true, photoIndex: -1 },
                    { id: generateId(), type: 'text', duration: 3000, text: 'MERRY CHRISTMAS' },
                    { id: generateId(), type: 'tree', duration: 2000 }
                  ];
                  updateConfig({ steps });
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255,215,0,0.1)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  borderRadius: '4px',
                  color: '#FFD700',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                🎄 经典模板
              </button>
              <button
                onClick={() => {
                  const steps: TimelineStep[] = [
                    { id: generateId(), type: 'intro', duration: 2000, text: 'I Love You' },
                    { id: generateId(), type: 'heart', duration: 5000, showPhoto: true, photoIndex: 0 },
                    { id: generateId(), type: 'tree', duration: 2000 }
                  ];
                  updateConfig({ steps });
                }}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(233,30,99,0.1)',
                  border: '1px solid rgba(233,30,99,0.3)',
                  borderRadius: '4px',
                  color: '#E91E63',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                💕 浪漫模板
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
