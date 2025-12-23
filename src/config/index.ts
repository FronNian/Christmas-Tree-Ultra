// 视觉配置 - 集中管理所有视觉参数
export const CONFIG = {
  colors: {
    emerald: '#004225',
    gold: '#FFD700',
    silver: '#ECEFF1',
    red: '#D32F2F',
    green: '#2E7D32',
    white: '#FFFFFF',
    warmLight: '#FFD54F',
    lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
    borders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#87CEFA', '#FFDAB9'],
    giftColors: ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32'],
    candyColors: ['#FF0000', '#FFFFFF']
  },
  counts: {
    foliage: 15000,
    ornaments: 32,
    elements: 500,
    lights: 400,
    snowflakes: 2000
  },
  snow: {
    fallSpeed: { min: 1, max: 3 },
    drift: 0.3,
    size: 0.4,
    opacity: 0.8,
    area: { width: 120, height: 80 },
    wobble: 0.01,
    color: '#ffffff'
  },
  tree: { height: 22, radius: 9 }
};

// ============ 视觉增强默认配置 ============

import type { BellConfig, ShootingStarsConfig, AuroraConfig, FireworksConfig, MusicWavesConfig } from '../types';

// 3D 铃铛装饰默认配置
export const DEFAULT_BELL_CONFIG: BellConfig = {
  enabled: false,
  count: 8,
  size: 1,
  color: '#FFD700',  // 金色
  swingAmplitude: 0.2,
  swingSpeed: 1
};

// 流星效果默认配置
export const DEFAULT_SHOOTING_STARS_CONFIG: ShootingStarsConfig = {
  enabled: false,
  frequency: [3, 8],  // 3-8 秒出现一次
  speed: 2,
  trailLength: 1,
  color: '#FFFFFF',
  glowIntensity: 1
};

// 极光背景默认配置
export const DEFAULT_AURORA_CONFIG: AuroraConfig = {
  enabled: false,
  colors: ['#00FF88', '#00BFFF', '#FF00FF'],  // 绿-蓝-紫
  intensity: 0.6,
  waveSpeed: 1,
  coverage: 0.7
};

// 烟花效果默认配置
export const DEFAULT_FIREWORKS_CONFIG: FireworksConfig = {
  enabled: false,
  explosionSize: 10,
  particleCount: 100,
  colors: ['#FF0000', '#FFD700', '#00FF00', '#00BFFF', '#FF00FF'],
  gravity: 1,
  fadeSpeed: 1,
  maxConcurrent: 3,
  triggerGesture: undefined
};

// 音乐波浪线（地面光轨）默认配置
export const DEFAULT_MUSIC_WAVES_CONFIG: MusicWavesConfig = {
  enabled: false,
  color: '#FFD700',
  secondaryColor: '#FFFFFF',
  lineCount: 3,
  radius: 14,
  width: 0.08,
  baseAmplitude: 0.25,
  musicStrength: 1.0,
  speed: 1.0
};

// 圣诞音乐 URL
export const CHRISTMAS_MUSIC_URL = '/music/mixkit-christmas-stars-866.mp3';
