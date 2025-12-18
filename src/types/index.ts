// 场景状态类型
export type SceneState = 'CHAOS' | 'FORMED';

// 手势类型
export type GestureType = 
  | 'None'
  | 'Closed_Fist'
  | 'Open_Palm'
  | 'Pointing_Up'
  | 'Thumb_Down'
  | 'Thumb_Up'
  | 'Victory'
  | 'ILoveYou';

// 手势动作类型
export type GestureAction = 
  | 'none'           // 无动作
  | 'formed'         // 聚合圣诞树
  | 'chaos'          // 散开圣诞树
  | 'heart'          // 显示爱心
  | 'text'           // 显示文字
  | 'music'          // 切换音乐
  | 'screenshot'     // 截图
  | 'reset';         // 重置视角

// 手势配置
export interface GestureConfig {
  Closed_Fist: GestureAction;
  Open_Palm: GestureAction;
  Pointing_Up: GestureAction;
  Thumb_Down: GestureAction;
  Thumb_Up: GestureAction;
  Victory: GestureAction;
  ILoveYou: GestureAction;
}

// 音乐配置
export interface MusicConfig {
  selected: string;        // 当前选中的音乐 ID
  customUrl?: string;      // 自定义音乐 URL (base64 或 URL)
  volume: number;          // 音量 0-1
}

// 预设音乐列表
export const PRESET_MUSIC = [
  { id: 'christmas-stars', name: '🎵 Christmas Stars (纯音乐)', url: '/music/mixkit-christmas-stars-866.mp3', lrc: '' },
  { id: 'all-i-want', name: '🎄 All I Want for Christmas Is You', url: '/music/All I Want for Christmas Is You - Mariah Carey.mp3', lrc: '/music/All I Want for Christmas Is You - Mariah Carey.lrc' },
  { id: 'christmas-list', name: '📝 Christmas List', url: '/music/Christmas List - Anson Seabra.mp3', lrc: '/music/Christmas List - Anson Seabra.lrc' },
  { id: 'i-love-you-so', name: '💕 I Love You So', url: '/music/I Love You So - The Walters.mp3', lrc: '/music/I Love You So - The Walters.lrc' },
] as const;

// 场景配置类型
export interface SceneConfig {
  foliage: { enabled: boolean; count: number };
  lights: { enabled: boolean; count: number };
  elements: { 
    enabled: boolean; 
    count: number;
    customImages?: {
      box?: string;      // 替换方块的 PNG 图片 (base64)
      sphere?: string;   // 替换球体的 PNG 图片 (base64)
      cylinder?: string; // 替换圆柱的 PNG 图片 (base64)
    };
  };
  snow: { enabled: boolean; count: number; speed: number; size: number; opacity: number };
  sparkles: { enabled: boolean; count: number };
  stars: { enabled: boolean };
  bloom: { enabled: boolean; intensity: number };
  title: { enabled: boolean; text: string; size: number; font?: string };
  giftPile: { enabled: boolean; count: number };
  ribbons: { enabled: boolean; count: number };
  fog: { enabled: boolean; opacity: number };
  topStar?: { avatarUrl?: string };  // 树顶星星头像
  intro?: {                // 开场文案配置
    enabled: boolean;
    text: string;          // 主文案
    subText?: string;      // 副文案
    duration: number;      // 显示时长（毫秒）
  };
  music?: MusicConfig;     // 音乐配置
  gestures?: GestureConfig;
  gestureText?: string; // 剪刀手显示的文字（兼容旧版）
  gestureTexts?: string[]; // 多条文字轮播
  textSwitchInterval?: number; // 文字切换间隔（秒）
  gestureEffect?: {
    duration: number;      // 效果持续时间（毫秒）
    hideTree: boolean;     // 是否隐藏圣诞树
    textCount: number;     // 文字粒子数量
    heartCount: number;    // 爱心粒子数量
  };
  preloadText?: boolean;   // 分享链接打开时先显示文字效果
}

// 照片屏幕位置
export interface PhotoScreenPosition {
  index: number;
  x: number;
  y: number;
}

// 分享数据类型
export interface ShareData {
  id: string;
  photos: string[];
  musicUrl?: string;
  message?: string;
  createdAt: number;
  expiresAt: number;
  config: Record<string, unknown>;
}
