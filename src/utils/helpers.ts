
import { CONFIG } from '../config';
import type { 
  BellConfig, 
  ShootingStarsConfig, 
  AuroraConfig, 
  FireworksConfig,
  SceneConfig 
} from '../types';

// ============ 移动端性能适配 ============

/**
 * 移动端性能适配配置
 * 根据设备类型返回降级后的粒子数量和效果参数
 */
export interface MobileAdaptedConfig {
  bells: Partial<BellConfig>;
  shootingStars: Partial<ShootingStarsConfig>;
  aurora: Partial<AuroraConfig>;
  fireworks: Partial<FireworksConfig>;
  reductionFactor: number;  // 降级系数 (0-1)
}

/**
 * 获取移动端适配后的视觉增强配置
 * 移动端粒子数量降至桌面端的 50% 以下
 * @returns 适配后的配置对象
 */
export const getMobileAdaptedConfig = (): MobileAdaptedConfig => {
  const mobile = isMobile();
  const tablet = isTablet();
  
  // 桌面端不需要降级
  if (!mobile && !tablet) {
    return {
      bells: {},
      shootingStars: {},
      aurora: {},
      fireworks: {},
      reductionFactor: 1.0
    };
  }
  
  // 移动端降级系数：手机 0.3，平板 0.5
  const reductionFactor = mobile ? 0.3 : 0.5;
  
  return {
    bells: {
      count: mobile ? 5 : 8,           // 手机 5 个，平板 8 个（桌面默认 10）
      size: mobile ? 0.8 : 0.9,        // 略微缩小
      swingSpeed: mobile ? 0.8 : 1.0   // 降低动画频率
    },
    shootingStars: {
      frequency: mobile ? [8, 15] : [5, 12],  // 降低出现频率
      trailLength: mobile ? 0.5 : 0.8,        // 顺短拖尾
      glowIntensity: mobile ? 0.5 : 0.8       // 降低发光强度
    },
    aurora: {
      intensity: mobile ? 0.4 : 0.6,    // 降低亮度
      waveSpeed: mobile ? 0.5 : 0.8,    // 降低波动速度
      coverage: mobile ? 0.5 : 0.7      // 减少覆盖范围
    },
    fireworks: {
      particleCount: mobile ? 30 : 60,   // 大幅减少粒子数（桌面默认 100）
      maxConcurrent: mobile ? 1 : 2,     // 限制同时数量
      fadeSpeed: mobile ? 1.5 : 1.2      // 加快消散
    },
    reductionFactor
  };
};

/**
 * 应用移动端适配到场景配置
 * @param config 原始场景配置
 * @returns 适配后的场景配置
 */
export const applyMobileAdaptation = (config: SceneConfig): SceneConfig => {
  const mobile = isMobile();
  const tablet = isTablet();
  
  // 桌面端不需要适配
  if (!mobile && !tablet) {
    return config;
  }
  
  const adapted = getMobileAdaptedConfig();
  const result = { ...config };
  
  // 适配铃铛配置
  if (result.bells) {
    result.bells = {
      ...result.bells,
      count: Math.min(result.bells.count, adapted.bells.count ?? result.bells.count),
      size: Math.min(result.bells.size, adapted.bells.size ?? result.bells.size),
      swingSpeed: Math.min(result.bells.swingSpeed, adapted.bells.swingSpeed ?? result.bells.swingSpeed)
    };
  }
  
  // 适配流星配置
  if (result.shootingStars) {
    const adaptedFreq = adapted.shootingStars.frequency ?? result.shootingStars.frequency;
    result.shootingStars = {
      ...result.shootingStars,
      frequency: [
        Math.max(result.shootingStars.frequency[0], adaptedFreq[0]),
        Math.max(result.shootingStars.frequency[1], adaptedFreq[1])
      ],
      trailLength: Math.min(result.shootingStars.trailLength, adapted.shootingStars.trailLength ?? result.shootingStars.trailLength),
      glowIntensity: Math.min(result.shootingStars.glowIntensity, adapted.shootingStars.glowIntensity ?? result.shootingStars.glowIntensity)
    };
  }
  
  // 适配极光配置
  if (result.aurora) {
    result.aurora = {
      ...result.aurora,
      intensity: Math.min(result.aurora.intensity, adapted.aurora.intensity ?? result.aurora.intensity),
      waveSpeed: Math.min(result.aurora.waveSpeed, adapted.aurora.waveSpeed ?? result.aurora.waveSpeed),
      coverage: Math.min(result.aurora.coverage, adapted.aurora.coverage ?? result.aurora.coverage)
    };
  }
  
  // 适配烟花配置
  if (result.fireworks) {
    result.fireworks = {
      ...result.fireworks,
      particleCount: Math.min(result.fireworks.particleCount, adapted.fireworks.particleCount ?? result.fireworks.particleCount),
      maxConcurrent: Math.min(result.fireworks.maxConcurrent, adapted.fireworks.maxConcurrent ?? result.fireworks.maxConcurrent),
      fadeSpeed: Math.max(result.fireworks.fadeSpeed, adapted.fireworks.fadeSpeed ?? result.fireworks.fadeSpeed)
    };
  }
  
  return result;
};

/**
 * 检测设备性能等级
 * @returns 'high' | 'medium' | 'low'
 */
export const getDevicePerformanceLevel = (): 'high' | 'medium' | 'low' => {
  if (typeof window === 'undefined') return 'medium';
  
  const mobile = isMobile();
  const tablet = isTablet();
  
  // 检测硬件并发数（CPU 核心数）
  const cores = navigator.hardwareConcurrency || 4;
  
  // 检测设备内存（如果可用）
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  
  if (mobile) {
    // 移动端：低性能
    return 'low';
  }
  
  if (tablet) {
    // 平板：中等性能
    return 'medium';
  }
  
  // 桌面端根据硬件判断
  if (cores >= 8 && memory >= 8) {
    return 'high';
  } else if (cores >= 4 && memory >= 4) {
    return 'medium';
  }
  
  return 'low';
};

// 检测是否为移动端（手机）
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad 在新版 iOS 上会伪装成 Mac，需要通过触摸点检测
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // 平板不算移动端（宽度 >= 768）
  if (isIPad || /tablet|playbook|silk/i.test(ua)) {
    return false;
  }
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    window.innerWidth < 768;
};

// 检测是否为平板
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  return isIPad || isAndroidTablet || /tablet|playbook|silk/i.test(ua) ||
    (window.innerWidth >= 768 && window.innerWidth <= 1024 && 'ontouchstart' in window);
};

// ============ WebGL 兼容性检测 ============

export interface WebGLCapabilities {
  webglSupported: boolean;
  webgl2Supported: boolean;
  maxTextureSize: number;
  maxRenderbufferSize: number;
  highpSupported: boolean;
  floatTexturesSupported: boolean;
  halfFloatSupported: boolean;
  logarithmicDepthSupported: boolean;
  antialiasSupported: boolean;
  renderer: string;
  vendor: string;
  isLowEnd: boolean;
}

// 缓存 WebGL 能力检测结果，避免重复创建上下文
let cachedWebGLCapabilities: WebGLCapabilities | null = null;

/**
 * 检测 WebGL 能力和兼容性
 * 用于在渲染前确定最佳配置
 * 结果会被缓存，避免重复检测导致的性能问题
 */
export const getWebGLCapabilities = (): WebGLCapabilities => {
  // 返回缓存的结果
  if (cachedWebGLCapabilities) {
    return cachedWebGLCapabilities;
  }

  const defaultCaps: WebGLCapabilities = {
    webglSupported: false,
    webgl2Supported: false,
    maxTextureSize: 2048,
    maxRenderbufferSize: 2048,
    highpSupported: false,
    floatTexturesSupported: false,
    halfFloatSupported: false,
    logarithmicDepthSupported: false,
    antialiasSupported: false,
    renderer: 'unknown',
    vendor: 'unknown',
    isLowEnd: true
  };

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return defaultCaps;
  }

  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let isWebGL2 = false;

  // 尝试获取 WebGL2 上下文
  try {
    gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (gl) {
      isWebGL2 = true;
    }
  } catch {
    // WebGL2 不支持
  }

  // 回退到 WebGL1
  if (!gl) {
    try {
      gl = canvas.getContext('webgl') as WebGLRenderingContext | null ||
           canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    } catch {
      return defaultCaps;
    }
  }

  if (!gl) {
    return defaultCaps;
  }

  // 获取渲染器信息
  let renderer = 'unknown';
  let vendor = 'unknown';
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
      vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
    }
  } catch {
    // 忽略
  }

  // 检测高精度浮点支持
  let highpSupported = false;
  try {
    const shaderPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    highpSupported = shaderPrecision ? shaderPrecision.precision > 0 : false;
  } catch {
    highpSupported = false;
  }

  // 检测浮点纹理支持
  const floatTexturesSupported = isWebGL2 || !!gl.getExtension('OES_texture_float');
  
  // 检测半精度浮点支持
  const halfFloatSupported = isWebGL2 || !!gl.getExtension('OES_texture_half_float');

  // 检测对数深度缓冲支持（WebGL2 原生支持，WebGL1 需要扩展）
  const logarithmicDepthSupported = isWebGL2 || !!gl.getExtension('EXT_frag_depth');

  // 获取最大纹理尺寸
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;
  const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 2048;

  // 检测抗锯齿支持
  let antialiasSupported = false;
  try {
    const testCanvas = document.createElement('canvas');
    const testGl = testCanvas.getContext('webgl', { antialias: true }) as WebGLRenderingContext | null ||
                   testCanvas.getContext('experimental-webgl', { antialias: true }) as WebGLRenderingContext | null;
    if (testGl) {
      antialiasSupported = testGl.getContextAttributes()?.antialias || false;
    }
  } catch {
    antialiasSupported = false;
  }

  // 判断是否为低端设备
  const isLowEnd = detectLowEndDevice(renderer, vendor, maxTextureSize, isWebGL2);

  // 清理
  const loseContext = gl.getExtension('WEBGL_lose_context');
  if (loseContext) {
    loseContext.loseContext();
  }

  // 缓存结果，避免重复检测
  cachedWebGLCapabilities = {
    webglSupported: true,
    webgl2Supported: isWebGL2,
    maxTextureSize,
    maxRenderbufferSize,
    highpSupported,
    floatTexturesSupported,
    halfFloatSupported,
    logarithmicDepthSupported,
    antialiasSupported,
    renderer,
    vendor,
    isLowEnd
  };

  return cachedWebGLCapabilities;
};

/**
 * 检测是否为低端设备/浏览器
 */
function detectLowEndDevice(
  renderer: string,
  vendor: string,
  maxTextureSize: number,
  isWebGL2: boolean
): boolean {
  const rendererLower = renderer.toLowerCase();
  const vendorLower = vendor.toLowerCase();

  // 已知的低端 GPU 关键词
  const lowEndKeywords = [
    'mali-4', 'mali-t', 'mali-g5', // 老旧 Mali GPU
    'adreno 3', 'adreno 4', 'adreno 5', // 老旧 Adreno GPU
    'powervr sgx', // 老旧 PowerVR
    'intel hd graphics 4', 'intel hd graphics 5', // 老旧 Intel 集显
    'swiftshader', // 软件渲染
    'llvmpipe', // 软件渲染
    'microsoft basic render', // Windows 软件渲染
    'angle', // 某些 ANGLE 实现可能性能较差
  ];

  // 检查是否匹配低端关键词
  const isLowEndGPU = lowEndKeywords.some(keyword => 
    rendererLower.includes(keyword) || vendorLower.includes(keyword)
  );

  // 纹理尺寸过小也表示低端
  const hasSmallTextures = maxTextureSize < 4096;

  // 不支持 WebGL2 的设备通常较老
  const noWebGL2 = !isWebGL2;

  // 综合判断
  return isLowEndGPU || (hasSmallTextures && noWebGL2);
}

/**
 * 获取适合当前设备的 WebGL 配置
 */
export const getOptimalWebGLConfig = (): {
  antialias: boolean;
  powerPreference: 'high-performance' | 'low-power' | 'default';
  precision: 'highp' | 'mediump' | 'lowp';
  logarithmicDepthBuffer: boolean;
  stencil: boolean;
  depth: boolean;
  alpha: boolean;
  preserveDrawingBuffer: boolean;
  failIfMajorPerformanceCaveat: boolean;
} => {
  const caps = getWebGLCapabilities();
  const mobile = isMobile();

  return {
    // 移动端和低端设备禁用抗锯齿
    antialias: !mobile && !caps.isLowEnd && caps.antialiasSupported,
    // 移动端使用低功耗模式
    powerPreference: mobile ? 'low-power' : caps.isLowEnd ? 'default' : 'high-performance',
    // 根据设备能力选择精度
    precision: caps.highpSupported && !caps.isLowEnd ? 'highp' : 'mediump',
    // 低端设备禁用对数深度缓冲
    logarithmicDepthBuffer: caps.logarithmicDepthSupported && !caps.isLowEnd && !mobile,
    stencil: false,
    depth: true,
    alpha: false,
    // 截图功能需要 preserveDrawingBuffer，但会影响性能
    preserveDrawingBuffer: true,
    // 不要因为性能问题而失败，让用户至少能看到内容
    failIfMajorPerformanceCaveat: false
  };
};

/**
 * 获取适合当前设备的后期处理配置
 */
export const getOptimalPostProcessingConfig = (): {
  enabled: boolean;
  multisampling: number;
  useHalfFloat: boolean;
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomLevels: number;
  mipmapBlur: boolean;
} => {
  const caps = getWebGLCapabilities();
  const mobile = isMobile();
  const tablet = isTablet();

  // 低端设备完全禁用后期处理
  if (caps.isLowEnd) {
    return {
      enabled: false,
      multisampling: 0,
      useHalfFloat: false,
      bloomEnabled: false,
      bloomIntensity: 0,
      bloomLevels: 0,
      mipmapBlur: false
    };
  }

  return {
    enabled: true,
    multisampling: 0, // 后期处理中禁用多重采样以提高兼容性
    // 只有支持半精度浮点的设备才使用
    useHalfFloat: caps.halfFloatSupported && !mobile,
    bloomEnabled: true,
    bloomIntensity: mobile ? 1.0 : tablet ? 1.2 : 1.5,
    bloomLevels: mobile ? 3 : tablet ? 4 : 5,
    mipmapBlur: !mobile && !tablet
  };
};

// 生成树形位置（支持可选的种子随机参数和自定义尺寸）
export const getTreePosition = (
  seed1?: number, 
  seed2?: number,
  customHeight?: number,
  customRadius?: number
): [number, number, number] => {
  const h = customHeight ?? CONFIG.tree.height;
  const rBase = customRadius ?? CONFIG.tree.radius;
  const r1 = seed1 !== undefined ? seed1 : Math.random();
  const r2 = seed2 !== undefined ? seed2 : Math.random();
  // 使用 seed1 和 seed2 生成第三个伪随机数，确保分布均匀
  const r3 = seed1 !== undefined 
    ? (Math.sin(seed1 * 12.9898 + seed2! * 78.233) * 43758.5453 % 1 + 1) % 1
    : Math.random();
  const y = (r1 * h) - (h / 2);
  const normalizedY = (y + (h / 2)) / h;
  const currentRadius = rBase * (1 - normalizedY);
  const theta = r2 * Math.PI * 2;
  // 使用 sqrt 使粒子在圆盘上均匀分布（而不是集中在中心）
  const r = Math.sqrt(r3) * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

// 支持的图片 MIME 类型
const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml'
];

// 图片文件头魔数（用于二进制校验）
const IMAGE_SIGNATURES: { type: string; signature: number[] }[] = [
  { type: 'image/jpeg', signature: [0xFF, 0xD8, 0xFF] },
  { type: 'image/png', signature: [0x89, 0x50, 0x4E, 0x47] },
  { type: 'image/gif', signature: [0x47, 0x49, 0x46, 0x38] },
  { type: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  { type: 'image/bmp', signature: [0x42, 0x4D] },
];

/**
 * 校验文件是否为有效图片
 * 1. 检查 MIME 类型
 * 2. 检查文件头魔数
 * 3. 尝试加载为 Image 对象验证可渲染性
 */
export const validateImageFile = (file: File): Promise<{ valid: boolean; error?: string }> => {
  return new Promise((resolve) => {
    // 1. 检查 MIME 类型
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      resolve({ valid: false, error: `不支持的文件类型: ${file.type || '未知'}` });
      return;
    }

    // 2. 读取文件头进行二进制校验（只需前 16 字节）
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      
      // 检查文件头魔数
      const isValidSignature = IMAGE_SIGNATURES.some(({ signature }) => {
        return signature.every((byte, i) => arr[i] === byte);
      });

      // SVG 是文本格式，跳过魔数检查
      if (!isValidSignature && file.type !== 'image/svg+xml') {
        resolve({ valid: false, error: '文件内容与图片格式不匹配' });
        return;
      }

      // 3. 尝试加载为 Image 验证可渲染性（使用原始文件，而不是截断数据）
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width > 0 && img.height > 0) {
          resolve({ valid: true });
        } else {
          resolve({ valid: false, error: '图片尺寸无效' });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: '无法加载图片，文件可能已损坏' });
      };
      
      img.src = url;
    };

    reader.onerror = () => {
      resolve({ valid: false, error: '读取文件失败' });
    };

    // 只读取前 16 字节用于魔数检查
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
};

// 图片转 base64（带校验 + 超大图压缩以避免 GPU/内存压力导致的闪烁）
export const fileToBase64 = async (file: File, skipValidation = false): Promise<string> => {
  // 先校验图片有效性
  if (!skipValidation) {
    const validation = await validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || '无效的图片文件');
    }
  }

  // 读取为 DataURL
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // 对超大分辨率图片进行压缩/降采样，降低 GPU 纹理压力，避免 WebGL 闪烁/上下文丢失
  const MAX_DIMENSION = 2048; // 单边最大像素
  const type = file.type;

  // GIF/SVG 保持原始（避免破坏动图或矢量）
  if (type === 'image/gif' || type === 'image/svg+xml') {
    return dataUrl;
  }

  // 创建 Image 以检查尺寸
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = dataUrl;
  });

  const { width, height } = img;
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return dataUrl; // 尺寸在范围内，直接返回
  }

  // 计算等比缩放
  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, targetW, targetH);

  // JPEG/WebP 使用质量参数压缩，PNG/BMP 仍用原格式
  const isJpegLike = type === 'image/jpeg' || type === 'image/webp';
  const mime = isJpegLike ? type : 'image/png';
  const quality = isJpegLike ? 0.9 : undefined;

  return canvas.toDataURL(mime, quality);
};

// 检测是否支持全屏
export const isFullscreenSupported = (): boolean => {
  const doc = document as Document & {
    webkitFullscreenEnabled?: boolean;
    mozFullScreenEnabled?: boolean;
    msFullscreenEnabled?: boolean;
  };
  return !!(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    doc.mozFullScreenEnabled ||
    doc.msFullscreenEnabled
  );
};

// 检测当前是否全屏
export const isFullscreen = (): boolean => {
  const doc = document as Document & {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
    msFullscreenElement?: Element;
  };
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
};

// 进入全屏
export const enterFullscreen = async (element?: HTMLElement): Promise<boolean> => {
  const el = element || document.documentElement;
  const elem = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };
  
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// 退出全屏
export const exitFullscreen = async (): Promise<boolean> => {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };
  
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// 切换全屏
export const toggleFullscreen = async (): Promise<boolean> => {
  if (isFullscreen()) {
    return exitFullscreen();
  } else {
    return enterFullscreen();
  }
};

// 锁定屏幕方向为横屏（如果支持）
export const lockLandscape = async (): Promise<boolean> => {
  try {
    const screen = window.screen as Screen & {
      orientation?: {
        lock?: (orientation: string) => Promise<void>;
      };
    };
    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape');
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// 解锁屏幕方向
export const unlockOrientation = (): void => {
  try {
    const screen = window.screen as Screen & {
      orientation?: {
        unlock?: () => void;
      };
    };
    if (screen.orientation?.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    // 忽略错误
  }
};

// 获取默认场景配置（根据设备类型自动调整）
export const getDefaultSceneConfig = (forceMinimal = false): Record<string, unknown> => {
  const mobile = isMobile();
  const tablet = isTablet();
  // 移动端和平板默认使用最低配置
  const useMinimal = forceMinimal || mobile || tablet;
  
  return {
    foliage: { 
      enabled: true, 
      count: useMinimal ? 3000 : 15000, 
      color: '#00FF88', 
      size: 1, 
      glow: 1 
    },
    lights: { 
      enabled: true, 
      count: useMinimal ? 50 : 400 
    },
    elements: { 
      enabled: true, 
      count: useMinimal ? 80 : 500 
    },
    snow: { 
      enabled: true, 
      count: useMinimal ? 300 : 2000, 
      speed: 2, 
      size: 0.5, 
      opacity: 0.8 
    },
    sparkles: { 
      enabled: !useMinimal, 
      count: useMinimal ? 0 : 600 
    },
    stars: { enabled: true },
    bloom: { 
      enabled: true, 
      intensity: useMinimal ? 1.0 : 1.5 
    },
    title: { enabled: true, text: 'Merry Christmas', size: 48 },
    giftPile: { 
      enabled: true, 
      count: useMinimal ? 8 : 18 
    },
    ribbons: { 
      enabled: true, 
      count: useMinimal ? 15 : 50 
    },
    fog: { enabled: true, opacity: 0.3, count: 800, size: 0.8, spread: 1, height: 1.5 },
    music: {
      selected: 'christmas-stars',
      volume: 0.5,
      showLyrics: true
    },
    gestures: {
      Closed_Fist: 'formed',
      Open_Palm: 'chaos',
      Pointing_Up: 'music',
      Thumb_Down: 'zoomOut',
      Thumb_Up: 'zoomIn',
      Victory: 'text',
      ILoveYou: 'heart',
      Pinch: 'none'
    },
    gestureText: 'MERRY CHRISTMAS',
    gestureEffect: {
      duration: 5000,
      hideTree: true,
      textCount: useMinimal ? 500 : 1000,
      heartCount: useMinimal ? 800 : 1500
    },
    // 音乐波浪线默认关闭（可在设置中开启）
    musicWaves: {
      enabled: false,
      color: '#FFD700',
      secondaryColor: '#FFFFFF',
      lineCount: useMinimal ? 1 : 3,
      radius: useMinimal ? 12 : 14,
      width: 0.08,
      baseAmplitude: 0.25,
      musicStrength: 1.0,
      speed: 1.0
    },
    cameraSensitivity: 25, // 默认灵敏度
    zoomSpeed: 100, // 默认放大缩小速度
    topStar: { size: 1.0 } // 树顶星星默认大小（倍数）
  };
};
