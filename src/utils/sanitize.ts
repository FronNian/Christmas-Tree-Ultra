
/**
 * 安全验证和清理工具
 * 防止 XSS 攻击和恶意内容注入
 */

// 允许的图片 MIME 类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// 允许的字体列表（白名单）
const ALLOWED_FONTS = [
  'ZCOOL XiaoWei', 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', 'Zhi Mang Xing',
  'Liu Jian Mao Cao', 'Long Cang', 'ZCOOL KuaiLe', 'Noto Serif SC', 'Noto Sans SC',
  'Mountains of Christmas', 'Great Vibes', 'Dancing Script', 'Pacifico', 'Lobster',
  'Satisfy', 'Tangerine', 'Allura', 'Alex Brush', 'Pinyon Script', 'Sacramento'
];

/**
 * 清理 HTML 特殊字符，防止 XSS
 */
export const escapeHtml = (str: string): string => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * 验证并清理文本内容
 * - 移除潜在的脚本标签
 * - 限制长度
 * - 移除控制字符
 */
export const sanitizeText = (text: unknown, maxLength: number = 200): string => {
  if (typeof text !== 'string') return '';
  
  return text
    // 移除所有 HTML 标签
    .replace(/<[^>]*>/g, '')
    // 移除 javascript: 协议
    .replace(/javascript:/gi, '')
    // 移除 data: 协议（除了图片）
    .replace(/data:(?!image\/(jpeg|png|gif|webp))[^;]*/gi, '')
    // 移除控制字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // 限制长度
    .slice(0, maxLength)
    .trim();
};

/**
 * 验证字体名称是否在白名单中
 */
export const sanitizeFont = (font: unknown): string => {
  if (typeof font !== 'string') return 'Mountains of Christmas';
  const cleanFont = font.replace(/['"]/g, '').trim();
  return ALLOWED_FONTS.includes(cleanFont) ? cleanFont : 'Mountains of Christmas';
};

/**
 * 验证 base64 图片数据
 * - 检查是否为有效的 data URL
 * - 检查 MIME 类型是否允许
 * - 限制大小
 */
export const sanitizeBase64Image = (data: unknown, maxSizeBytes: number = 5 * 1024 * 1024): string | null => {
  if (typeof data !== 'string') return null;
  
  // 检查是否为 data URL 格式
  const dataUrlMatch = data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!dataUrlMatch) return null;
  
  const mimeType = dataUrlMatch[1].toLowerCase();
  const base64Data = dataUrlMatch[2];
  
  // 检查 MIME 类型
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;
  
  // 估算大小（base64 编码后约为原始大小的 4/3）
  const estimatedSize = (base64Data.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) return null;
  
  // 验证 base64 格式
  try {
    atob(base64Data);
  } catch {
    return null;
  }
  
  return data;
};

/**
 * 验证数字在合理范围内
 */
export const sanitizeNumber = (value: unknown, min: number, max: number, defaultValue: number): number => {
  if (typeof value !== 'number' || isNaN(value)) return defaultValue;
  return Math.max(min, Math.min(max, value));
};

/**
 * 验证布尔值
 */
export const sanitizeBoolean = (value: unknown, defaultValue: boolean = false): boolean => {
  if (typeof value !== 'boolean') return defaultValue;
  return value;
};

/**
 * 验证并清理分享配置
 */
export const sanitizeShareConfig = (config: unknown): Record<string, unknown> => {
  if (!config || typeof config !== 'object') return {};
  
  const cfg = config as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};
  
  // 树叶配置
  if (cfg.foliage && typeof cfg.foliage === 'object') {
    const f = cfg.foliage as Record<string, unknown>;
    const foliage: Record<string, unknown> = {
      enabled: sanitizeBoolean(f.enabled, true),
      count: sanitizeNumber(f.count, 5000, 25000, 15000),
      size: sanitizeNumber(f.size, 0.5, 2, 1),
      glow: sanitizeNumber(f.glow, 0.5, 2, 1)
    };
    // 颜色验证
    if (typeof f.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(f.color)) {
      foliage.color = f.color;
    }
    if (typeof f.chaosColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(f.chaosColor)) {
      foliage.chaosColor = f.chaosColor;
    }
    sanitized.foliage = foliage;
  }
  
  // 彩灯配置
  if (cfg.lights && typeof cfg.lights === 'object') {
    const l = cfg.lights as Record<string, unknown>;
    sanitized.lights = {
      enabled: sanitizeBoolean(l.enabled, true),
      count: sanitizeNumber(l.count, 50, 1000, 400)
    };
    // 彩灯颜色验证
    if (l.colors && typeof l.colors === 'object') {
      const c = l.colors as Record<string, unknown>;
      const colors: Record<string, string> = {};
      const colorKeys = ['color1', 'color2', 'color3', 'color4'];
      for (const key of colorKeys) {
        if (typeof c[key] === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c[key] as string)) {
          colors[key] = c[key] as string;
        }
      }
      if (Object.keys(colors).length > 0) {
        (sanitized.lights as Record<string, unknown>).colors = colors;
      }
    }
  }
  
  // 圣诞元素配置
  if (cfg.elements && typeof cfg.elements === 'object') {
    const e = cfg.elements as Record<string, unknown>;
    const elements: Record<string, unknown> = {
      enabled: sanitizeBoolean(e.enabled, true),
      count: sanitizeNumber(e.count, 50, 1000, 500)
    };
    // 装饰类型开关
    if (e.types && typeof e.types === 'object') {
      const t = e.types as Record<string, unknown>;
      elements.types = {
        box: sanitizeBoolean(t.box, true),
        sphere: sanitizeBoolean(t.sphere, true),
        cylinder: sanitizeBoolean(t.cylinder, true)
      };
    }
    // 装饰样式配置
    if (e.styleConfig && typeof e.styleConfig === 'object') {
      const sc = e.styleConfig as Record<string, unknown>;
      const allowedStyles = ['classic', 'crystal', 'gem', 'nature', 'modern'];
      const allowedMaterials = ['standard', 'glass', 'metallic', 'emissive'];
      elements.styleConfig = {
        style: typeof sc.style === 'string' && allowedStyles.includes(sc.style) ? sc.style : 'classic',
        material: typeof sc.material === 'string' && allowedMaterials.includes(sc.material) ? sc.material : 'standard',
        transparency: sanitizeNumber(sc.transparency, 0, 0.8, 0),
        metalness: sanitizeNumber(sc.metalness, 0, 1, 0.4),
        roughness: sanitizeNumber(sc.roughness, 0, 1, 0.3),
        emissiveIntensity: sanitizeNumber(sc.emissiveIntensity, 0, 2, 0.2)
      };
    }
    // 闪烁配置
    if (e.twinkle && typeof e.twinkle === 'object') {
      const tw = e.twinkle as Record<string, unknown>;
      const twinkle: Record<string, unknown> = {
        enabled: sanitizeBoolean(tw.enabled, true),
        speed: sanitizeNumber(tw.speed, 0.5, 3, 1)
      };
      // 闪烁颜色配置
      if (typeof tw.flashColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(tw.flashColor)) {
        twinkle.flashColor = tw.flashColor;
      }
      if (typeof tw.baseColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(tw.baseColor)) {
        twinkle.baseColor = tw.baseColor;
      }
      elements.twinkle = twinkle;
    }
    // 自定义图片需要验证
    if (e.customImages && typeof e.customImages === 'object') {
      const ci = e.customImages as Record<string, unknown>;
      const customImages: Record<string, string> = {};
      if (ci.box) {
        const boxImg = sanitizeBase64Image(ci.box);
        if (boxImg) customImages.box = boxImg;
      }
      if (ci.sphere) {
        const sphereImg = sanitizeBase64Image(ci.sphere);
        if (sphereImg) customImages.sphere = sphereImg;
      }
      if (ci.cylinder) {
        const cylinderImg = sanitizeBase64Image(ci.cylinder);
        if (cylinderImg) customImages.cylinder = cylinderImg;
      }
      if (Object.keys(customImages).length > 0) {
        elements.customImages = customImages;
      }
    }
    // 自定义颜色验证
    if (e.colors && typeof e.colors === 'object') {
      const c = e.colors as Record<string, unknown>;
      const colors: Record<string, string> = {};
      const colorKeys = ['primary', 'secondary', 'accent', 'candy1', 'candy2'];
      for (const key of colorKeys) {
        if (typeof c[key] === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c[key] as string)) {
          colors[key] = c[key] as string;
        }
      }
      if (Object.keys(colors).length > 0) {
        elements.colors = colors;
      }
    }
    sanitized.elements = elements;
  }
  
  // 雪花配置
  if (cfg.snow && typeof cfg.snow === 'object') {
    const s = cfg.snow as Record<string, unknown>;
    sanitized.snow = {
      enabled: sanitizeBoolean(s.enabled, true),
      count: sanitizeNumber(s.count, 100, 10000, 2000),
      speed: sanitizeNumber(s.speed, 0.1, 10, 2),
      size: sanitizeNumber(s.size, 0.1, 5, 0.5),
      opacity: sanitizeNumber(s.opacity, 0.1, 1, 0.8)
    };
  }
  
  // 闪光配置
  if (cfg.sparkles && typeof cfg.sparkles === 'object') {
    const sp = cfg.sparkles as Record<string, unknown>;
    sanitized.sparkles = {
      enabled: sanitizeBoolean(sp.enabled, true),
      count: sanitizeNumber(sp.count, 0, 2000, 600)
    };
  }
  
  // 星空配置
  if (cfg.stars && typeof cfg.stars === 'object') {
    const st = cfg.stars as Record<string, unknown>;
    sanitized.stars = {
      enabled: sanitizeBoolean(st.enabled, true),
      count: sanitizeNumber(st.count, 1000, 10000, 5000),
      brightness: sanitizeNumber(st.brightness, 1, 8, 4)
    };
  }
  
  // 泛光配置
  if (cfg.bloom && typeof cfg.bloom === 'object') {
    const b = cfg.bloom as Record<string, unknown>;
    sanitized.bloom = {
      enabled: sanitizeBoolean(b.enabled, true),
      intensity: sanitizeNumber(b.intensity, 0, 5, 1.5)
    };
  }
  
  // 标题配置
  if (cfg.title && typeof cfg.title === 'object') {
    const t = cfg.title as Record<string, unknown>;
    const title: Record<string, unknown> = {
      enabled: sanitizeBoolean(t.enabled, true),
      text: sanitizeText(t.text, 100) || 'Merry Christmas',
      size: sanitizeNumber(t.size, 12, 200, 48),
      font: sanitizeFont(t.font)
    };
    // 颜色验证
    if (typeof t.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(t.color)) {
      title.color = t.color;
    }
    if (typeof t.shadowColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(t.shadowColor)) {
      title.shadowColor = t.shadowColor;
    }
    sanitized.title = title;
  }
  
  // 礼物堆配置
  if (cfg.giftPile && typeof cfg.giftPile === 'object') {
    const g = cfg.giftPile as Record<string, unknown>;
    const giftPile: Record<string, unknown> = {
      enabled: sanitizeBoolean(g.enabled, true),
      count: sanitizeNumber(g.count, 1, 100, 18)
    };
    // 颜色数组验证
    if (Array.isArray(g.colors)) {
      const validColors = g.colors
        .slice(0, 6)
        .filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
      if (validColors.length > 0) {
        giftPile.colors = validColors;
      }
    }
    sanitized.giftPile = giftPile;
  }
  
  // 丝带配置
  if (cfg.ribbons && typeof cfg.ribbons === 'object') {
    const r = cfg.ribbons as Record<string, unknown>;
    const ribbons: Record<string, unknown> = {
      enabled: sanitizeBoolean(r.enabled, true),
      count: sanitizeNumber(r.count, 10, 200, 50)
    };
    // 颜色数组验证
    if (Array.isArray(r.colors)) {
      const validColors = r.colors
        .slice(0, 6)
        .filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
      if (validColors.length > 0) {
        ribbons.colors = validColors;
      }
    }
    sanitized.ribbons = ribbons;
  }
  
  // 雾气配置
  if (cfg.fog && typeof cfg.fog === 'object') {
    const fo = cfg.fog as Record<string, unknown>;
    const fog: Record<string, unknown> = {
      enabled: sanitizeBoolean(fo.enabled, true),
      opacity: sanitizeNumber(fo.opacity, 0.1, 1, 0.3),
      count: sanitizeNumber(fo.count, 100, 5000, 800),
      size: sanitizeNumber(fo.size, 0.1, 3, 0.8),
      spread: sanitizeNumber(fo.spread, 0.5, 3, 1),
      height: sanitizeNumber(fo.height, 0.5, 3, 1.5)
    };
    if (typeof fo.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(fo.color)) {
      fog.color = fo.color;
    }
    sanitized.fog = fog;
  }
  
  // 背景配置
  if (cfg.background && typeof cfg.background === 'object') {
    const bg = cfg.background as Record<string, unknown>;
    if (typeof bg.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(bg.color)) {
      sanitized.background = { color: bg.color };
    }
  }
  
  // 爱心特效配置
  if (cfg.heartEffect && typeof cfg.heartEffect === 'object') {
    const he = cfg.heartEffect as Record<string, unknown>;
    const heartEffect: Record<string, unknown> = {
      size: sanitizeNumber(he.size, 0.5, 2, 1),
      photoInterval: sanitizeNumber(he.photoInterval, 1000, 10000, 3000),
      photoScale: sanitizeNumber(he.photoScale, 0.5, 3, 1),
      bottomTextSize: sanitizeNumber(he.bottomTextSize, 0.5, 2, 1)
    };
    if (typeof he.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(he.color)) {
      heartEffect.color = he.color;
    }
    if (typeof he.frameColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(he.frameColor)) {
      heartEffect.frameColor = he.frameColor;
    }
    if (typeof he.bottomText === 'string') {
      heartEffect.bottomText = sanitizeText(he.bottomText, 50);
    }
    if (typeof he.bottomTextColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(he.bottomTextColor)) {
      heartEffect.bottomTextColor = he.bottomTextColor;
    }
    // 流光效果配置
    if (he.glowTrail && typeof he.glowTrail === 'object') {
      const gt = he.glowTrail as Record<string, unknown>;
      const glowTrail: Record<string, unknown> = {
        enabled: sanitizeBoolean(gt.enabled, true),
        speed: sanitizeNumber(gt.speed, 1, 10, 3),
        count: sanitizeNumber(gt.count, 1, 5, 2),
        size: sanitizeNumber(gt.size, 0.5, 3, 1.5)
      };
      if (typeof gt.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(gt.color)) {
        glowTrail.color = gt.color;
      }
      heartEffect.glowTrail = glowTrail;
    }
    sanitized.heartEffect = heartEffect;
  }
  
  // 文字特效配置
  if (cfg.textEffect && typeof cfg.textEffect === 'object') {
    const te = cfg.textEffect as Record<string, unknown>;
    const textEffect: Record<string, unknown> = {
      size: sanitizeNumber(te.size, 0.5, 2, 1)
    };
    if (typeof te.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(te.color)) {
      textEffect.color = te.color;
    }
    sanitized.textEffect = textEffect;
  }
  
  // 螺旋带子配置
  if (cfg.spiralRibbon && typeof cfg.spiralRibbon === 'object') {
    const sr = cfg.spiralRibbon as Record<string, unknown>;
    const spiralRibbon: Record<string, unknown> = {
      enabled: sanitizeBoolean(sr.enabled, true),
      width: sanitizeNumber(sr.width, 0.3, 2, 0.8),
      turns: sanitizeNumber(sr.turns, 2, 8, 5),
      double: sanitizeBoolean(sr.double, false)
    };
    // 颜色验证
    if (typeof sr.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(sr.color)) {
      spiralRibbon.color = sr.color;
    }
    if (typeof sr.glowColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(sr.glowColor)) {
      spiralRibbon.glowColor = sr.glowColor;
    }
    sanitized.spiralRibbon = spiralRibbon;
  }
  
  // 发光流线配置
  if (cfg.glowingStreaks && typeof cfg.glowingStreaks === 'object') {
    const gs = cfg.glowingStreaks as Record<string, unknown>;
    const glowingStreaks: Record<string, unknown> = {
      enabled: sanitizeBoolean(gs.enabled, false),
      count: sanitizeNumber(gs.count, 1, 10, 5),
      speed: sanitizeNumber(gs.speed, 0.5, 3, 1),
      tailLength: sanitizeNumber(gs.tailLength, 0.5, 2, 1.2),
      lineWidth: sanitizeNumber(gs.lineWidth, 1, 8, 3)
    };
    if (typeof gs.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(gs.color)) {
      glowingStreaks.color = gs.color;
    }
    sanitized.glowingStreaks = glowingStreaks;
  }
  
  // 圣诞树形状配置
  if (cfg.treeShape && typeof cfg.treeShape === 'object') {
    const ts = cfg.treeShape as Record<string, unknown>;
    sanitized.treeShape = {
      height: sanitizeNumber(ts.height, 10, 50, 25),
      radius: sanitizeNumber(ts.radius, 3, 20, 10)
    };
  }
  
  // 照片装饰配置
  if (cfg.photoOrnaments && typeof cfg.photoOrnaments === 'object') {
    const po = cfg.photoOrnaments as Record<string, unknown>;
    const photoOrnaments: Record<string, unknown> = {
      enabled: sanitizeBoolean(po.enabled, true),
      scale: sanitizeNumber(po.scale, 0.5, 2, 1.5)
    };
    if (typeof po.frameColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(po.frameColor)) {
      photoOrnaments.frameColor = po.frameColor;
    }
    sanitized.photoOrnaments = photoOrnaments;
  }
  
  // 手势文字配置
  if (cfg.gestureText !== undefined) {
    sanitized.gestureText = sanitizeText(cfg.gestureText, 50) || 'MERRY CHRISTMAS';
  }
  
  // 多条文字配置
  if (Array.isArray(cfg.gestureTexts)) {
    sanitized.gestureTexts = cfg.gestureTexts
      .slice(0, 10) // 最多 10 条
      .map(t => sanitizeText(t, 50))
      .filter(t => t.length > 0);
  }

  // 主题标签
  if (cfg.themeLabel !== undefined) {
    const label = sanitizeText(cfg.themeLabel, 50);
    if (label) sanitized.themeLabel = label;
  }
  
  // 文字切换间隔
  if (cfg.textSwitchInterval !== undefined) {
    sanitized.textSwitchInterval = sanitizeNumber(cfg.textSwitchInterval, 1, 30, 3);
  }
  
  // 特效配置
  if (cfg.gestureEffect && typeof cfg.gestureEffect === 'object') {
    const ge = cfg.gestureEffect as Record<string, unknown>;
    sanitized.gestureEffect = {
      duration: sanitizeNumber(ge.duration, 1000, 30000, 5000),
      hideTree: sanitizeBoolean(ge.hideTree, true),
      textCount: sanitizeNumber(ge.textCount, 100, 5000, 1000),
      heartCount: sanitizeNumber(ge.heartCount, 100, 5000, 1500)
    };
  }
  
  // 预加载文字
  if (cfg.preloadText !== undefined) {
    sanitized.preloadText = sanitizeBoolean(cfg.preloadText, false);
  }
  
  // 树顶星星/头像配置
  if (cfg.topStar && typeof cfg.topStar === 'object') {
    const ts = cfg.topStar as Record<string, unknown>;
    const topStar: Record<string, unknown> = {};
    if (ts.avatarUrl) {
      const avatarImg = sanitizeBase64Image(ts.avatarUrl);
      if (avatarImg) topStar.avatarUrl = avatarImg;
    }
    // 验证并添加大小配置
    if (ts.size !== undefined) {
      topStar.size = sanitizeNumber(ts.size, 0.3, 3.0, 1.0);
    }
    // 如果有任何配置项，就添加 topStar
    if (Object.keys(topStar).length > 0) {
      sanitized.topStar = topStar;
    }
  }
  
  // 开场文案配置
  if (cfg.intro && typeof cfg.intro === 'object') {
    const intro = cfg.intro as Record<string, unknown>;
    sanitized.intro = {
      enabled: sanitizeBoolean(intro.enabled, false),
      text: sanitizeText(intro.text, 100) || '献给最特别的你',
      subText: intro.subText ? sanitizeText(intro.subText, 100) : undefined,
      duration: sanitizeNumber(intro.duration, 2000, 15000, 4000)
    };
  }
  
  // 音乐配置
  if (cfg.music && typeof cfg.music === 'object') {
    const m = cfg.music as Record<string, unknown>;
    const music: Record<string, unknown> = {
      selected: sanitizeText(m.selected, 50) || 'christmas-stars',
      volume: sanitizeNumber(m.volume, 0, 1, 0.5),
      showLyrics: sanitizeBoolean(m.showLyrics, true)
    };
    // 自定义音乐 URL（base64）
    if (m.customUrl && typeof m.customUrl === 'string') {
      // 验证是否为 audio data URL
      if (m.customUrl.startsWith('data:audio/')) {
        music.customUrl = m.customUrl;
      }
    }
    sanitized.music = music;
  }
  
  // 手势配置
  if (cfg.gestures && typeof cfg.gestures === 'object') {
    const g = cfg.gestures as Record<string, unknown>;
    const allowedActions = ['none', 'formed', 'chaos', 'heart', 'text', 'music', 'screenshot', 'reset'];
    const gestureKeys = ['Closed_Fist', 'Open_Palm', 'Pointing_Up', 'Thumb_Down', 'Thumb_Up', 'Victory', 'ILoveYou'];
    const gestures: Record<string, string> = {};
    
    for (const key of gestureKeys) {
      const action = g[key];
      if (typeof action === 'string' && allowedActions.includes(action)) {
        gestures[key] = action;
      }
    }
    
    if (Object.keys(gestures).length > 0) {
      sanitized.gestures = gestures;
    }
  }
  
  // 动画配置
  if (cfg.animation && typeof cfg.animation === 'object') {
    const a = cfg.animation as Record<string, unknown>;
    const allowedEasings = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'bounce', 'elastic'];
    const allowedScatterShapes = ['sphere', 'explosion', 'spiral', 'rain', 'ring'];
    const allowedGatherShapes = ['direct', 'stack', 'spiralIn', 'implode', 'waterfall', 'wave'];
    const easing = typeof a.easing === 'string' && allowedEasings.includes(a.easing) 
      ? a.easing 
      : 'easeInOut';
    const scatterShape = typeof a.scatterShape === 'string' && allowedScatterShapes.includes(a.scatterShape)
      ? a.scatterShape
      : 'sphere';
    const gatherShape = typeof a.gatherShape === 'string' && allowedGatherShapes.includes(a.gatherShape)
      ? a.gatherShape
      : 'direct';
    sanitized.animation = {
      easing,
      speed: sanitizeNumber(a.speed, 0.3, 3, 1),
      scatterShape,
      gatherShape
    };
  }
  
  // 时间轴配置
  if (cfg.timeline && typeof cfg.timeline === 'object') {
    const t = cfg.timeline as Record<string, unknown>;
    const timeline: Record<string, unknown> = {
      enabled: sanitizeBoolean(t.enabled, false),
      autoPlay: sanitizeBoolean(t.autoPlay, true),
      loop: sanitizeBoolean(t.loop, false),
      steps: []
    };
    
    // 时间轴专用音乐
    if (typeof t.music === 'string') {
      timeline.music = sanitizeText(t.music, 50);
    }
    
    // 验证步骤数组
    if (Array.isArray(t.steps)) {
      const allowedTypes = ['intro', 'photo', 'heart', 'text', 'tree', 'gift', 'voice', 'letter'];
      const validSteps = t.steps
        .slice(0, 20) // 最多20个步骤
        .filter((step): step is Record<string, unknown> => 
          step && typeof step === 'object' && 
          typeof (step as Record<string, unknown>).type === 'string' &&
          allowedTypes.includes((step as Record<string, unknown>).type as string)
        )
        .map(step => {
          const base = {
            id: typeof step.id === 'string' ? step.id.slice(0, 20) : Math.random().toString(36).substr(2, 9),
            type: step.type as string,
            duration: sanitizeNumber(step.duration, 1000, 60000, 3000),
            delay: sanitizeNumber(step.delay, 0, 10000, 0)
          };
          
          switch (step.type) {
            case 'intro':
              return {
                ...base,
                text: sanitizeText(step.text, 100) || '献给最特别的你',
                subText: step.subText ? sanitizeText(step.subText, 100) : undefined
              };
            case 'photo':
              return {
                ...base,
                photoIndex: sanitizeNumber(step.photoIndex, -1, 100, -1)
              };
            case 'heart':
              return {
                ...base,
                showPhoto: sanitizeBoolean(step.showPhoto, false),
                photoIndex: sanitizeNumber(step.photoIndex, -1, 100, -1)
              };
            case 'text': {
              const textStep: Record<string, unknown> = {
                ...base,
                text: sanitizeText(step.text, 50) || 'MERRY CHRISTMAS',
                useConfiguredText: sanitizeBoolean(step.useConfiguredText, false)
              };
              // 动画类型验证
              const allowedAnimations = ['particle', 'fadeIn', 'typewriter', 'glow', 'sparkle', 'wave', 'bounce', 'gradient', 'neon'];
              if (typeof step.animation === 'string' && allowedAnimations.includes(step.animation)) {
                textStep.animation = step.animation;
              }
              return textStep;
            }
            case 'gift': {
              const giftStep: Record<string, unknown> = {
                ...base,
                message: sanitizeText(step.message, 200) || '祝你圣诞快乐！',
                messageDuration: sanitizeNumber(step.messageDuration, 1000, 10000, 3000)
              };
              if (typeof step.boxColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(step.boxColor)) {
                giftStep.boxColor = step.boxColor;
              }
              if (typeof step.ribbonColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(step.ribbonColor)) {
                giftStep.ribbonColor = step.ribbonColor;
              }
              return giftStep;
            }
            case 'voice': {
              const voiceStep: Record<string, unknown> = {
                ...base,
                showIndicator: sanitizeBoolean(step.showIndicator, true)
              };
              // audioUrl 由服务端处理，audioData 在分享时提取
              if (typeof step.audioUrl === 'string' && step.audioUrl.startsWith('voice:')) {
                voiceStep.audioUrl = step.audioUrl;
              }
              if (typeof step.audioData === 'string' && step.audioData.startsWith('data:audio/')) {
                voiceStep.audioData = step.audioData;
              }
              return voiceStep;
            }
            case 'letter': {
              const letterStep: Record<string, unknown> = {
                ...base,
                content: sanitizeText(step.content, 2000) || '',  // 书信内容最多 2000 字
                speed: sanitizeNumber(step.speed, 30, 500, 100),
                fontSize: sanitizeNumber(step.fontSize, 14, 48, 24)
              };
              if (typeof step.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(step.color)) {
                letterStep.color = step.color;
              }
              return letterStep;
            }
            case 'tree':
              return base;
            default:
              return base;
          }
        });
      
      timeline.steps = validSteps;
    }
    
    sanitized.timeline = timeline;
  }
  
  // 3D 铃铛装饰配置
  if (cfg.bells && typeof cfg.bells === 'object') {
    const b = cfg.bells as Record<string, unknown>;
    const bells: Record<string, unknown> = {
      enabled: sanitizeBoolean(b.enabled, false),
      count: sanitizeNumber(b.count, 5, 20, 10),
      size: sanitizeNumber(b.size, 0.5, 2, 1),
      swingAmplitude: sanitizeNumber(b.swingAmplitude, 0.1, 0.5, 0.2),
      swingSpeed: sanitizeNumber(b.swingSpeed, 0.5, 2, 1)
    };
    if (typeof b.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(b.color)) {
      bells.color = b.color;
    }
    sanitized.bells = bells;
  }
  
  // 流星效果配置
  if (cfg.shootingStars && typeof cfg.shootingStars === 'object') {
    const ss = cfg.shootingStars as Record<string, unknown>;
    const shootingStars: Record<string, unknown> = {
      enabled: sanitizeBoolean(ss.enabled, false),
      speed: sanitizeNumber(ss.speed, 1, 5, 2),
      trailLength: sanitizeNumber(ss.trailLength, 0.5, 2, 1),
      glowIntensity: sanitizeNumber(ss.glowIntensity, 0.5, 2, 1)
    };
    // 频率范围验证
    if (Array.isArray(ss.frequency) && ss.frequency.length === 2) {
      const min = sanitizeNumber(ss.frequency[0], 1, 30, 3);
      const max = sanitizeNumber(ss.frequency[1], 1, 30, 8);
      shootingStars.frequency = [Math.min(min, max), Math.max(min, max)];
    }
    if (typeof ss.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(ss.color)) {
      shootingStars.color = ss.color;
    }
    sanitized.shootingStars = shootingStars;
  }
  
  // 极光背景配置
  if (cfg.aurora && typeof cfg.aurora === 'object') {
    const au = cfg.aurora as Record<string, unknown>;
    const aurora: Record<string, unknown> = {
      enabled: sanitizeBoolean(au.enabled, false),
      intensity: sanitizeNumber(au.intensity, 0.3, 1, 0.6),
      waveSpeed: sanitizeNumber(au.waveSpeed, 0.5, 2, 1),
      coverage: sanitizeNumber(au.coverage, 0.3, 1, 0.6)
    };
    // 颜色数组验证
    if (Array.isArray(au.colors) && au.colors.length === 3) {
      const validColors = au.colors
        .filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
      if (validColors.length === 3) {
        aurora.colors = validColors;
      }
    }
    sanitized.aurora = aurora;
  }
  
  // 烟花效果配置
  if (cfg.fireworks && typeof cfg.fireworks === 'object') {
    const fw = cfg.fireworks as Record<string, unknown>;
    const fireworks: Record<string, unknown> = {
      enabled: sanitizeBoolean(fw.enabled, false),
      explosionSize: sanitizeNumber(fw.explosionSize, 5, 20, 10),
      particleCount: sanitizeNumber(fw.particleCount, 50, 200, 100),
      gravity: sanitizeNumber(fw.gravity, 0.5, 2, 1),
      fadeSpeed: sanitizeNumber(fw.fadeSpeed, 0.5, 2, 1),
      maxConcurrent: sanitizeNumber(fw.maxConcurrent, 1, 5, 3)
    };
    // 颜色数组验证
    if (Array.isArray(fw.colors)) {
      const validColors = fw.colors
        .slice(0, 10)
        .filter((c): c is string => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c));
      if (validColors.length > 0) {
        fireworks.colors = validColors;
      }
    }
    sanitized.fireworks = fireworks;
  }
  
  // 音乐波浪线（地面光轨）配置
  if (cfg.musicWaves && typeof cfg.musicWaves === 'object') {
    const mw = cfg.musicWaves as Record<string, unknown>;
    const musicWaves: Record<string, unknown> = {
      enabled: sanitizeBoolean(mw.enabled, false),
      lineCount: sanitizeNumber(mw.lineCount, 1, 6, 3),
      radius: sanitizeNumber(mw.radius, 8, 20, 14),
      width: sanitizeNumber(mw.width, 0.03, 0.15, 0.08),
      baseAmplitude: sanitizeNumber(mw.baseAmplitude, 0.1, 0.5, 0.25),
      musicStrength: sanitizeNumber(mw.musicStrength, 0.5, 2, 1.0),
      speed: sanitizeNumber(mw.speed, 0.5, 2, 1.0)
    };
    // 颜色验证
    if (typeof mw.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(mw.color)) {
      musicWaves.color = mw.color;
    }
    if (typeof mw.secondaryColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(mw.secondaryColor)) {
      musicWaves.secondaryColor = mw.secondaryColor;
    }
    sanitized.musicWaves = musicWaves;
  }
  
  // 视角移动灵敏度
  if (cfg.cameraSensitivity !== undefined) {
    sanitized.cameraSensitivity = sanitizeNumber(cfg.cameraSensitivity, 5, 200, 25);
  }
  
  // 放大缩小速度
  if (cfg.zoomSpeed !== undefined) {
    sanitized.zoomSpeed = sanitizeNumber(cfg.zoomSpeed, 10, 200, 100);
  }
  
  return sanitized;
};

/**
 * 验证并清理照片数组
 */
export const sanitizePhotos = (photos: unknown, maxCount: number = 100): string[] => {
  if (!Array.isArray(photos)) return [];
  
  return photos
    .slice(0, maxCount)
    .map(p => sanitizeBase64Image(p))
    .filter((p): p is string => p !== null);
};
