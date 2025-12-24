
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
  | 'zoomOut'        // 缩小（拉远）
  | 'themeClassic'   // 主题：经典绿红金
  | 'themeIcy'       // 主题：冰蓝银白
  | 'themeCandy';    // 主题：糖果粉红

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
  showLyrics?: boolean;    // 是否显示歌词字幕
}

// 预设音乐列表
export const PRESET_MUSIC = [
  { id: 'christmas-stars', name: '🎵 Christmas Stars (纯音乐)', url: '/music/mixkit-christmas-stars-866.mp3', lrc: '' },
  { id: 'all-i-want', name: '🎄 All I Want for Christmas Is You', url: '/music/All I Want for Christmas Is You - Mariah Carey.mp3', lrc: '/music/All I Want for Christmas Is You - Mariah Carey.lrc' },
  { id: 'last-christmas', name: '🎅 Last Christmas (圣诞节版)', url: '/music/Last Christmas (圣诞节版) - DreamSky.mp3', lrc: '/music/Last Christmas (圣诞节版) - DreamSky.lrc' },
  { id: 'christmas-list', name: '📝 Christmas List', url: '/music/Christmas List - Anson Seabra.mp3', lrc: '/music/Christmas List - Anson Seabra.lrc' },
  { id: 'i-love-you-so', name: '💕 I Love You So', url: '/music/I Love You So - The Walters.mp3', lrc: '/music/I Love You So - The Walters.lrc' },
  { id: 'yi-dian-dian', name: '✨ 一点点 (为什么晚上总是有星星)', url: '/music/一点点 (为什么晚上总是有星星) - 董唧唧、芊芊龍.mp3', lrc: '/music/一点点 (为什么晚上总是有星星) - 董唧唧、芊芊龍.lrc' },
  { id: 'we-dont-talk-anymore', name: '💔 We Don\'t Talk Anymore', url: '/music/We Don\'t Talk Anymore - Charlie Puth、Selena Gomez.mp3', lrc: '/music/We Don\'t Talk Anymore - Charlie Puth、Selena Gomez.lrc' },
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

// 装饰类型开关配置
export interface DecorationTypes {
  box: boolean;       // 方块装饰
  sphere: boolean;    // 球体装饰
  cylinder: boolean;  // 圆柱装饰（糖果棒）
}

// 装饰样式类型
export type DecorationStyle = 
  | 'classic'    // 经典：方块、球体、糖果棒
  | 'crystal'    // 水晶：八面体、菱形、棱柱
  | 'gem'        // 宝石：钻石、祖母绿、心形
  | 'nature'     // 自然：松果、雪花、冰晶
  | 'modern';    // 现代：星形、多面体、环形

// 装饰材质类型
export type DecorationMaterial = 
  | 'standard'      // 标准材质
  | 'glass'         // 玻璃/透明
  | 'metallic'      // 金属光泽
  | 'emissive';     // 自发光

// 装饰样式配置
export interface DecorationStyleConfig {
  style: DecorationStyle;           // 装饰样式
  material: DecorationMaterial;     // 材质类型
  transparency: number;             // 透明度 0-1
  metalness: number;                // 金属度 0-1
  roughness: number;                // 粗糙度 0-1
  emissiveIntensity: number;        // 发光强度 0-2
}

// 装饰闪烁配置
export interface DecorationTwinkle {
  enabled: boolean;   // 是否启用闪烁
  speed: number;      // 闪烁频率 0.5-3（1为默认，数值越大闪烁越快）
  flashColor?: string;  // 闪烁时的颜色（默认白色）
  baseColor?: string;   // 未闪烁时的基础发光颜色（默认使用装饰本身颜色）
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

// 发光流线配置
export interface GlowingStreaksConfig {
  enabled: boolean;
  count: number;           // 流线数量 1-10
  color: string;           // 流线颜色
  speed: number;           // 速度 0.5-3
  tailLength: number;      // 拖尾长度 0.5-2
  lineWidth: number;       // 线条粗细 1-8
}

// ============ 视觉增强配置 ============

// 3D 铃铛装饰配置
export interface BellConfig {
  enabled: boolean;
  count: number;           // 铃铛数量 5-20
  size: number;            // 大小倍数 0.5-2
  color: string;           // 金属颜色 (金色/银色/铜色)
  swingAmplitude: number;  // 摆动幅度 0.1-0.5
  swingSpeed: number;      // 摆动速度 0.5-2
}

// 流星效果配置
export interface ShootingStarsConfig {
  enabled: boolean;
  frequency: [number, number];  // 出现间隔范围 [min, max] 秒
  speed: number;                // 移动速度 1-5
  trailLength: number;          // 拖尾长度 0.5-2
  color: string;                // 流星颜色
  glowIntensity: number;        // 发光强度 0.5-2
}

// 极光背景配置
export interface AuroraConfig {
  enabled: boolean;
  colors: [string, string, string];  // 三色渐变
  intensity: number;                  // 亮度 0.3-1
  waveSpeed: number;                  // 波动速度 0.5-2
  coverage: number;                   // 覆盖范围 0.3-1
}

// 烟花效果配置
export interface FireworksConfig {
  enabled: boolean;
  explosionSize: number;      // 爆炸半径 5-20
  particleCount: number;      // 粒子数量 50-200
  colors: string[];           // 烟花颜色数组
  gravity: number;            // 重力强度 0.5-2
  fadeSpeed: number;          // 消散速度 0.5-2
  maxConcurrent: number;      // 最大同时数量 1-5
  triggerGesture?: GestureAction;  // 触发手势
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

// 音乐波浪线（地面光轨）配置
export interface MusicWavesConfig {
  enabled: boolean;
  color?: string;           // 主颜色
  secondaryColor?: string;  // 次要颜色/尾部颜色
  lineCount: number;        // 线条数量 1-6
  radius: number;           // 基础半径
  width: number;            // 线宽（视觉上控制亮度）
  baseAmplitude: number;    // 无音乐时基础振幅
  musicStrength: number;    // 音乐响应强度 0-2
  speed: number;            // 流动速度 0.2-3
}

// 场景配置类型
export interface SceneConfig {
  foliage: FoliageConfig;
  animation?: AnimationConfig;  // 聚合/散开动画配置
  lights: { enabled: boolean; count: number; colors?: LightColors };
  elements: { 
    enabled: boolean; 
    count: number;
    types?: DecorationTypes;  // 装饰类型开关（默认全开）
    twinkle?: DecorationTwinkle;  // 闪烁配置
    styleConfig?: DecorationStyleConfig;  // 装饰样式配置
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
  fog: { 
    enabled: boolean; 
    opacity: number; 
    color?: string;
    count?: number;      // 粒子数量
    size?: number;       // 粒子大小
    spread?: number;     // 扩散范围
    height?: number;     // 高度范围
  };
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
    bottomText?: string;      // 爱心底部文字
    bottomTextColor?: string; // 底部文字颜色
    bottomTextSize?: number;  // 底部文字大小倍数
  };
  textEffect?: { color: string; size?: number };
  treeShape?: { height: number; radius: number };
  spiralRibbon?: SpiralRibbonConfig;  // 螺旋带子配置
  glowingStreaks?: GlowingStreaksConfig;  // 发光流线配置
  // 视觉增强配置
  bells?: BellConfig;                 // 3D 铃铛装饰
  shootingStars?: ShootingStarsConfig; // 流星效果
  aurora?: AuroraConfig;              // 极光背景
  fireworks?: FireworksConfig;        // 烟花效果
  musicWaves?: MusicWavesConfig;      // 音乐波浪线（地面光轨）
  topStar?: { avatarUrl?: string; size?: number };  // 树顶星星头像和大小（默认1.0）
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
  themeLabel?: string;     // 当前主题标签（自定义或预设名称）
  cameraSensitivity?: number; // 视角移动灵敏度
  zoomSpeed?: number;      // 放大缩小速度
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
  voiceUrls?: string[];  // 语音祝福音频 URL 列表
}

// ============ 时间轴/故事线模式 ============

// 时间轴步骤类型
export type TimelineStepType = 
  | 'intro'      // 开场文案
  | 'photo'      // 居中显示照片
  | 'heart'      // 爱心特效
  | 'text'       // 文字特效
  | 'tree'       // 圣诞树聚合（结束）
  | 'gift'       // 礼物拆开（等待点击）
  | 'voice'      // 语音祝福
  | 'letter';    // 书信模式

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

// 礼物拆开步骤（等待用户点击）
export interface GiftStep extends TimelineStepBase {
  type: 'gift';
  message: string;            // 祝福语
  boxColor?: string;          // 礼物盒颜色
  ribbonColor?: string;       // 丝带颜色
  messageDuration?: number;   // 祝福语显示时长 (ms)，默认 3000
}

// 语音祝福步骤
export interface VoiceStep extends TimelineStepBase {
  type: 'voice';
  audioUrl?: string;          // 音频 URL (分享后)
  audioData?: string;         // 音频 Base64 (本地)
  showIndicator?: boolean;    // 是否显示播放指示器
}

// 书信步骤
export interface LetterStep extends TimelineStepBase {
  type: 'letter';
  content: string;           // 书信内容（支持多行）
  speed?: number;            // 打字速度（毫秒/字），默认 100
  fontSize?: number;        // 字体大小，默认 24
  color?: string;           // 文字颜色，默认 '#FFD700'
}

// 时间轴步骤联合类型
export type TimelineStep = IntroStep | PhotoStep | HeartStep | TextStep | TreeStep | GiftStep | VoiceStep | LetterStep;

// 时间轴配置
export interface TimelineConfig {
  enabled: boolean;           // 是否启用时间轴模式
  autoPlay: boolean;          // 分享链接打开时自动播放
  loop: boolean;              // 是否循环播放
  steps: TimelineStep[];      // 步骤列表
  music?: string;             // 时间轴专用音乐ID（可选，不设置则使用全局音乐）
}
