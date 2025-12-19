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
  | 'reset'          // 重置视角
  | 'zoomIn'         // 放大（拉近）
  | 'zoomOut';       // 缩小（拉远）

// 手势配置（基于 HandLandmarker 自定义识别）
export interface GestureConfig {
  Closed_Fist: GestureAction;    // ✊ 握拳
  Open_Palm: GestureAction;      // 🖐️ 张开手掌（静止时触发，移动时控制视角）
  Pointing_Up: GestureAction;    // ☝️ 食指向上
  Thumb_Down: GestureAction;     // 👎 大拇指向下
  Thumb_Up: GestureAction;       // 👍 大拇指向上
  Victory: GestureAction;        // ✌️ 剪刀手
  ILoveYou: GestureAction;       // 🤟 我爱你
  Pinch: GestureAction;          // 🤏 捏合（选择照片）
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
  { id: 'yi-dian-dian', name: '✨ 一点点 (为什么晚上总是有星星)', url: '/music/一点点 (为什么晚上总是有星星) - 董唧唧、芊芊龍.mp3', lrc: '/music/一点点 (为什么晚上总是有星星) - 董唧唧、芊芊龍.lrc' },
] as const;

// 动画缓动类型
export type AnimationEasing = 
  | 'linear'      // 线性（匀速）
  | 'easeIn'      // 先慢后快
  | 'easeOut'     // 先快后慢
  | 'easeInOut'   // 两头慢中间快
  | 'bounce'      // 弹跳效果
  | 'elastic';    // 弹性效果

// 散开形状类型
export type ScatterShape = 
  | 'sphere'      // 球形散开（默认）
  | 'explosion'   // 爆炸式向外
  | 'spiral'      // 螺旋散开
  | 'rain'        // 向上飘散
  | 'ring';       // 环形散开

// 聚合形状类型
export type GatherShape = 
  | 'direct'      // 直接聚合（默认）
  | 'stack'       // 搭积木（从下往上堆叠）
  | 'spiralIn'    // 螺旋聚合
  | 'implode'     // 向心收缩
  | 'waterfall'   // 瀑布落下
  | 'wave';       // 波浪扫过

// 动画配置
export interface AnimationConfig {
  easing: AnimationEasing;    // 缓动函数
  speed: number;              // 动画速度 0.5-3（1为默认）
  scatterShape: ScatterShape; // 散开形状
  gatherShape: GatherShape;   // 聚合形状
}

// 装饰颜色配置
export interface DecorationColors {
  primary: string;    // 主色（礼物盒、球体）
  secondary: string;  // 次色（礼物盒、球体）
  accent: string;     // 强调色（礼物盒、球体）
  candy1: string;     // 糖果棒颜色1
  candy2: string;     // 糖果棒颜色2
}

// 彩灯颜色配置
export interface LightColors {
  color1: string;
  color2: string;
  color3: string;
  color4: string;
}

// 螺旋带子配置
export interface SpiralRibbonConfig {
  enabled: boolean;
  color: string;           // 带子颜色
  glowColor: string;       // 发光颜色
  width: number;           // 带子宽度 0.3-2
  turns: number;           // 盘旋圈数 2-8
  double: boolean;         // 是否双层（两条交错的带子）
}

// 树叶粒子配置
export interface FoliageConfig {
  enabled: boolean;
  count: number;              // 粒子数量 5000-25000
  color: string;              // 聚合后颜色
  chaosColor?: string;        // 散开时颜色（可选，不设置则使用暗色）
  size: number;               // 粒子大小倍数 0.5-2
  glow: number;               // 发光强度 0.5-2
}

// 场景配置类型
export interface SceneConfig {
  foliage: FoliageConfig;
  animation?: AnimationConfig;  // 聚合/散开动画配置
  lights: { enabled: boolean; count: number; colors?: LightColors };
  elements: { 
    enabled: boolean; 
    count: number;
    customImages?: {
      box?: string;      // 替换方块的 PNG 图片 (base64)
      sphere?: string;   // 替换球体的 PNG 图片 (base64)
      cylinder?: string; // 替换圆柱的 PNG 图片 (base64)
    };
    colors?: DecorationColors;  // 自定义装饰颜色
  };
  snow: { enabled: boolean; count: number; speed: number; size: number; opacity: number };
  sparkles: { enabled: boolean; count: number };
  stars: { enabled: boolean; count?: number; brightness?: number };
  bloom: { enabled: boolean; intensity: number };
  title: { enabled: boolean; text: string; size: number; font?: string; color?: string; shadowColor?: string };
  giftPile: { enabled: boolean; count: number; colors?: string[] };
  ribbons: { enabled: boolean; count: number; colors?: string[] };
  fog: { enabled: boolean; opacity: number; color?: string };
  background?: { color: string };
  photoOrnaments?: {       // 照片装饰配置
    enabled?: boolean;     // 是否显示照片装饰
    scale?: number;        // 照片大小倍数 (0.5-2)
    frameColor?: string;   // 相框颜色
  };
  heartEffect?: { 
    color: string; 
    size?: number; 
    photoInterval?: number;
    photoScale?: number;      // 相框大小倍数，默认1
    frameColor?: string;      // 相框颜色，默认白色
    glowTrail?: {
      enabled?: boolean;      // 是否启用流光效果
      color?: string;         // 流光颜色
      speed?: number;         // 流动速度 (1-10)
      count?: number;         // 流光数量
      size?: number;          // 流光大小
    };
  };
  textEffect?: { color: string; size?: number };
  treeShape?: { height: number; radius: number };
  spiralRibbon?: SpiralRibbonConfig;  // 螺旋带子配置
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
  preloadText?: boolean;   // 分享链接打开时先显示文字效果（时间轴模式下忽略）
  timeline?: TimelineConfig; // 时间轴/故事线配置
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

// ============ 时间轴/故事线模式 ============

// 时间轴步骤类型
export type TimelineStepType = 
  | 'intro'      // 开场文案
  | 'photo'      // 居中显示照片
  | 'heart'      // 爱心特效
  | 'text'       // 文字特效
  | 'tree';      // 圣诞树聚合（结束）

// 时间轴步骤基础接口
export interface TimelineStepBase {
  id: string;           // 唯一标识
  type: TimelineStepType;
  duration: number;     // 持续时间（毫秒）
  delay?: number;       // 开始前延迟（毫秒）
}

// 开场文案步骤
export interface IntroStep extends TimelineStepBase {
  type: 'intro';
  text: string;         // 主文案
  subText?: string;     // 副文案
}

// 照片展示步骤
export interface PhotoStep extends TimelineStepBase {
  type: 'photo';
  photoIndex: number;   // 照片索引（-1 表示按顺序自动选择）
}

// 爱心特效步骤
export interface HeartStep extends TimelineStepBase {
  type: 'heart';
  showPhoto?: boolean;  // 是否在中心显示照片
  photoIndex?: number;  // 显示哪张照片（-1 表示按顺序）
}

// 文字动画类型
export type TextAnimationType = 
  | 'particle'      // 粒子效果（仅英文）
  | 'fadeIn'        // 淡入
  | 'typewriter'    // 打字机
  | 'glow'          // 发光脉冲
  | 'sparkle'       // 闪烁星光
  | 'wave'          // 波浪
  | 'bounce'        // 弹跳
  | 'gradient'      // 渐变流动
  | 'neon';         // 霓虹灯

// 文字特效步骤
export interface TextStep extends TimelineStepBase {
  type: 'text';
  text: string;                    // 显示的文字
  animation?: TextAnimationType;   // 动画类型（默认自动：英文用粒子，中文用glow）
  useConfiguredText?: boolean;     // 使用已配置的文字粒子内容（gestureTexts）
}

// 圣诞树聚合步骤（结束）
export interface TreeStep extends TimelineStepBase {
  type: 'tree';
}

// 时间轴步骤联合类型
export type TimelineStep = IntroStep | PhotoStep | HeartStep | TextStep | TreeStep;

// 时间轴配置
export interface TimelineConfig {
  enabled: boolean;           // 是否启用时间轴模式
  autoPlay: boolean;          // 分享链接打开时自动播放
  loop: boolean;              // 是否循环播放
  steps: TimelineStep[];      // 步骤列表
  music?: string;             // 时间轴专用音乐ID（可选，不设置则使用全局音乐）
}
