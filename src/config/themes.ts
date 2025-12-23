import type { SceneConfig } from '../types';

export type ThemeKey = 'classic' | 'icy' | 'candy';

// 预设主题（仅包含差异字段，应用时与当前配置深度合并）
export const THEME_PRESETS: Record<ThemeKey, Partial<SceneConfig>> = {
  classic: {
    background: { color: '#000300' },
    foliage: { enabled: true, count: 15000, color: '#00FF88', glow: 1.1, size: 1 },
    lights: { enabled: true, count: 400, colors: { color1: '#FF0000', color2: '#FFD700', color3: '#00FF00', color4: '#FFFFFF' } },
    elements: {
      enabled: true,
      count: 500,
      colors: { primary: '#FFD700', secondary: '#D32F2F', accent: '#FFFFFF', candy1: '#FF0000', candy2: '#FFFFFF' },
      styleConfig: { style: 'classic', material: 'standard', transparency: 0, metalness: 0.35, roughness: 0.35, emissiveIntensity: 0.3 }
    },
    ribbons: { enabled: true, count: 50, colors: ['#FF2E63', '#FFD700', '#FFFFFF'] },
    fog: { enabled: true, color: '#0f1a0f', opacity: 0.3 },
    spiralRibbon: { enabled: true, color: '#FF2E63', glowColor: '#FFD700', width: 0.8, turns: 5, double: false },
    glowingStreaks: { enabled: true, count: 5, color: '#FFD700', speed: 1, tailLength: 1.2, lineWidth: 3 },
    textEffect: { color: '#FFD700' },
    heartEffect: { color: '#FF2E63' },
    musicWaves: {
      enabled: true,
      color: '#FFD700',
      secondaryColor: '#FFFFFF',
      lineCount: 3,
      radius: 14,
      width: 0.08,
      baseAmplitude: 0.25,
      musicStrength: 1.0,
      speed: 1.0
    }
  },
  icy: {
    background: { color: '#020813' },
    foliage: { enabled: true, count: 14000, color: '#7DE1FF', glow: 1.3, size: 1 },
    lights: { enabled: true, count: 350, colors: { color1: '#7DE1FF', color2: '#B0C4DE', color3: '#90CAF9', color4: '#E0F7FA' } },
    elements: {
      enabled: true,
      count: 420,
      colors: { primary: '#90CAF9', secondary: '#E3F2FD', accent: '#FFFFFF', candy1: '#B0C4DE', candy2: '#E3F2FD' },
      styleConfig: { style: 'modern', material: 'glass', transparency: 0.25, metalness: 0.1, roughness: 0.2, emissiveIntensity: 0.4 }
    },
    ribbons: { enabled: true, count: 40, colors: ['#7DE1FF', '#B0C4DE', '#FFFFFF'] },
    fog: { enabled: true, color: '#0a1b2e', opacity: 0.35 },
    spiralRibbon: { enabled: true, color: '#7DE1FF', glowColor: '#B3E5FC', width: 0.7, turns: 6, double: false },
    glowingStreaks: { enabled: true, count: 6, color: '#B3E5FC', speed: 1.2, tailLength: 1.2, lineWidth: 2.5 },
    textEffect: { color: '#B3E5FC' },
    heartEffect: { color: '#7DE1FF' },
    aurora: { enabled: true, colors: ['#7DE1FF', '#B3E5FC', '#0A2340'], intensity: 0.65, waveSpeed: 1, coverage: 0.8 },
    shootingStars: { enabled: true, frequency: [4, 8], speed: 2, trailLength: 1.2, color: '#B3E5FC', glowIntensity: 1.1 },
    musicWaves: {
      enabled: true,
      color: '#7DE1FF',
      secondaryColor: '#B3E5FC',
      lineCount: 3,
      radius: 14,
      width: 0.08,
      baseAmplitude: 0.25,
      musicStrength: 1.1,
      speed: 1.1
    }
  },
  candy: {
    background: { color: '#1a0614' },
    foliage: { enabled: true, count: 15000, color: '#FF8FB1', chaosColor: '#FFB3C6', glow: 1.2, size: 1 },
    lights: { enabled: true, count: 380, colors: { color1: '#FF6FB5', color2: '#FFD1DC', color3: '#FFC107', color4: '#FFFFFF' } },
    elements: {
      enabled: true,
      count: 520,
      colors: { primary: '#FF6FB5', secondary: '#FFD1DC', accent: '#FFC107', candy1: '#FF6FB5', candy2: '#FFFFFF' },
      styleConfig: { style: 'modern', material: 'emissive', transparency: 0, metalness: 0.2, roughness: 0.3, emissiveIntensity: 0.6 }
    },
    ribbons: { enabled: true, count: 55, colors: ['#FF6FB5', '#FFD1DC', '#FFC107'] },
    fog: { enabled: true, color: '#2b0d1f', opacity: 0.32 },
    spiralRibbon: { enabled: true, color: '#FF6FB5', glowColor: '#FFD1DC', width: 0.9, turns: 5, double: true },
    glowingStreaks: { enabled: true, count: 6, color: '#FFC107', speed: 1.1, tailLength: 1.1, lineWidth: 3 },
    textEffect: { color: '#FF6FB5' },
    heartEffect: { color: '#FF6FB5' },
    giftPile: { enabled: true, count: 18, colors: ['#FF6FB5', '#FFD1DC', '#FFC107'] },
    musicWaves: {
      enabled: true,
      color: '#FF6FB5',
      secondaryColor: '#FFD1DC',
      lineCount: 3,
      radius: 14,
      width: 0.08,
      baseAmplitude: 0.25,
      musicStrength: 1.2,
      speed: 1.2
    }
  }
};

