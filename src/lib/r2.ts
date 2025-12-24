/**
 * Cloudflare R2 存储服务
 * 使用 Worker 代理上传，自定义域名访问
 */

// R2 Worker API 地址（需要部署 Worker 后填写）
// 部署后改成你的 Worker 域名，如 'https://r2-api.your-domain.com'
const R2_API_URL = import.meta.env.VITE_R2_API_URL || '';

// R2 公开访问域名（用于读取）
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// 本地存储 key
const LOCAL_SHARE_KEY = 'christmas_tree_share';
const LOCAL_CONFIG_KEY = 'christmas_tree_config';
const LOCAL_PHOTOS_KEY = 'christmas_tree_photos';

// 服务器限制（见 r2-server/server.js 校验逻辑）
const MAX_PHOTO_SIZE_MB = 10;    // 单张 base64 长度上限 10MB

// 分享数据接口
export interface ShareData {
  id: string;
  editToken: string;
  photos: string[];
  config: Record<string, unknown>;
  message?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  voiceUrls?: string[];  // 语音祝福音频 Base64 数据列表
  customMusicUrl?: string; // 自定义音乐 Base64 数据
}

const MAX_SHARE_SIZE_MB = 50;

const getShareSizeMB = (data: ShareData): number => {
  try {
    const str = JSON.stringify(data);
    return new Blob([str]).size / (1024 * 1024);
  } catch {
    return 0;
  }
};

// 估算 base64 图片大小（MB）
const estimateBase64SizeMB = (base64: string): number => {
  if (!base64) return 0;
  const commaIndex = base64.indexOf(',');
  const data = commaIndex >= 0 ? base64.slice(commaIndex + 1) : base64;
  const padding = (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  const bytes = (data.length * 3) / 4 - padding;
  return bytes / (1024 * 1024);
};

// 前置校验：单张大小（与后端保持一致，避免 400）
const validatePhotos = (photos: string[]): { ok: boolean; error?: string } => {
  for (let i = 0; i < photos.length; i++) {
    const size = estimateBase64SizeMB(photos[i]);
    if (size > MAX_PHOTO_SIZE_MB) {
      return {
        ok: false,
        error: `第 ${i + 1} 张图片过大（约 ${size.toFixed(1)} MB），单张上限 ${MAX_PHOTO_SIZE_MB} MB。请压缩后再试（推荐 https://imagestool.com/zh_CN/compress-images ）。`
      };
    }
  }
  return { ok: true };
};

// 本地存储的分享信息
interface LocalShareInfo {
  shareId: string;
  editToken: string;
  createdAt: number;
}

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 生成编辑 token
 */
const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 获取本地存储的分享信息
 */
export const getLocalShare = (): LocalShareInfo | null => {
  try {
    const data = localStorage.getItem(LOCAL_SHARE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * 保存分享信息到本地
 */
const saveLocalShare = (info: LocalShareInfo): void => {
  localStorage.setItem(LOCAL_SHARE_KEY, JSON.stringify(info));
};

/**
 * 检查是否已有分享
 */
export const hasExistingShare = (): boolean => {
  return getLocalShare() !== null;
};

/**
 * 获取分享的公开 URL
 */
export const getShareUrl = (shareId: string): string => {
  return `${window.location.origin}/${shareId}`;
};

/**
 * 获取编辑 URL
 */
export const getEditUrl = (shareId: string, editToken: string): string => {
  return `${window.location.origin}/${shareId}/edit?token=${editToken}`;
};

/**
 * 上传图片到 R2（通过 base64 直接存储在 JSON 中）
 * 注意：由于前端无法直接上传到 R2，我们将图片 base64 存储在 JSON 配置中
 */
export const uploadShare = async (
  photos: string[],
  config: Record<string, unknown>,
  message?: string
): Promise<{ success: boolean; shareId?: string; editToken?: string; error?: string }> => {
  try {
    if (!R2_API_URL) {
      return { success: false, error: '上传服务未配置，请联系管理员（缺少 R2_API_URL）。' };
    }

    // 预校验：数量与单张大小（与后端校验一致，提前给出友好提示）
    const photoValidation = validatePhotos(photos);
    if (!photoValidation.ok) {
      return { success: false, error: photoValidation.error };
    }

    const localShare = getLocalShare();
    
    // 如果已有分享，返回错误提示用户使用编辑功能
    if (localShare) {
      return {
        success: false,
        error: `您已创建过分享，请使用编辑功能更新。\n分享ID: ${localShare.shareId}`
      };
    }

    const shareId = generateId();
    const editToken = generateToken();
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7天后过期

    // 提取语音数据和自定义音乐
    const { voiceUrls, customMusicUrl, cleanConfig } = extractVoiceDataFromConfig(config);

    const shareData: ShareData = {
      id: shareId,
      editToken,
      photos,
      config: cleanConfig,
      message,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      voiceUrls: voiceUrls.length > 0 ? voiceUrls : undefined,
      customMusicUrl
    };

    // 前端体积保护，避免超过后端限制
    const sizeMB = getShareSizeMB(shareData);
    if (sizeMB > MAX_SHARE_SIZE_MB) {
      return {
        success: false,
        error: `分享数据过大（约 ${sizeMB.toFixed(1)} MB），请减少照片数量或压缩图片（推荐使用 https://imagestool.com/zh_CN/compress-images 进行压缩），控制在 ${MAX_SHARE_SIZE_MB}MB 内后重试。`
      };
    }

    // 上传到 R2（通过 Worker 代理）
    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shareData)
    });

    if (!response.ok) {
      // 400/413 等前端可识别错误，返回用户提示
      let serverMessage = '';
      try {
        // 优先解析 JSON，携带 details
        const text = await response.text();
        serverMessage = text;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error || parsed?.details) {
            const details = Array.isArray(parsed.details) ? parsed.details.join('; ') : '';
            serverMessage = `${parsed.error || ''}${details ? `: ${details}` : ''}`;
          }
        } catch {
          // 非 JSON，保留原文
        }
      } catch {
        // ignore
      }
      if (response.status === 400) {
        return { success: false, error: serverMessage || '上传失败：请求格式或参数错误（400）。' };
      }
      throw new Error(`上传失败: ${response.status}${serverMessage ? ` - ${serverMessage}` : ''}`);
    }

    // 保存到本地
    saveLocalShare({
      shareId,
      editToken,
      createdAt: now
    });

    return {
      success: true,
      shareId,
      editToken
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '上传失败'
    };
  }
};

/**
 * 更新分享（需要验证 token）
 */
export const updateShare = async (
  shareId: string,
  editToken: string,
  photos: string[],
  config: Record<string, unknown>,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!R2_API_URL) {
      return { success: false, error: '上传服务未配置，请联系管理员（缺少 R2_API_URL）。' };
    }

    // 预校验：数量与单张大小
    const photoValidation = validatePhotos(photos);
    if (!photoValidation.ok) {
      return { success: false, error: photoValidation.error };
    }

    // 先获取现有数据验证 token
    const existing = await getShare(shareId);
    if (!existing) {
      return { success: false, error: '分享不存在' };
    }
    
    if (existing.editToken !== editToken) {
      return { success: false, error: '无权编辑此分享' };
    }

    const now = Date.now();
    
    // 提取语音数据和自定义音乐
    const { voiceUrls, customMusicUrl, cleanConfig } = extractVoiceDataFromConfig(config);
    
    const updatedData: ShareData = {
      ...existing,
      photos,
      config: cleanConfig,
      message,
      updatedAt: now,
      voiceUrls: voiceUrls.length > 0 ? voiceUrls : undefined,
      customMusicUrl
    };

    const sizeMB = getShareSizeMB(updatedData);
    if (sizeMB > MAX_SHARE_SIZE_MB) {
      return {
        success: false,
        error: `分享数据过大（约 ${sizeMB.toFixed(1)} MB），请减少照片数量或压缩图片（推荐使用 https://imagestool.com/zh_CN/compress-images 进行压缩）后再更新（上限 ${MAX_SHARE_SIZE_MB}MB）。`
      };
    }

    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      let serverMessage = '';
      try {
        const text = await response.text();
        serverMessage = text;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error || parsed?.details) {
            const details = Array.isArray(parsed.details) ? parsed.details.join('; ') : '';
            serverMessage = `${parsed.error || ''}${details ? `: ${details}` : ''}`;
          }
        } catch {
          // keep raw text
        }
      } catch {
        // ignore
      }
      if (response.status === 400) {
        return { success: false, error: serverMessage || '更新失败：请求格式或参数错误（400）。' };
      }
      throw new Error(`更新失败: ${response.status}${serverMessage ? ` - ${serverMessage}` : ''}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '更新失败'
    };
  }
};

/**
 * 获取分享数据
 */
export const getShare = async (shareId: string): Promise<ShareData | null> => {
  try {
    // 加上时间戳参数 + 关闭缓存，避免云端/CDN 对 JSON 的缓存导致更新后的分享看起来“没生效”
    const url = `${R2_PUBLIC_URL}/shares/${shareId}.json?ts=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`获取失败: ${response.status}`);
    }

    const data: ShareData = await response.json();
    
    // 检查是否过期
    if (data.expiresAt < Date.now()) {
      return null;
    }

    // 还原语音数据和自定义音乐到配置中
    data.config = restoreVoiceDataToConfig(data.config, data.voiceUrls, data.customMusicUrl);

    return data;
  } catch (error) {
    console.error('Get share error:', error);
    return null;
  }
};

/**
 * 验证编辑权限
 */
export const verifyEditToken = async (
  shareId: string,
  editToken: string
): Promise<boolean> => {
  const share = await getShare(shareId);
  return share?.editToken === editToken;
};

/**
 * 检查本地分享是否仍然有效
 */
export const checkLocalShareValid = async (): Promise<{
  valid: boolean;
  shareId?: string;
  editToken?: string;
}> => {
  const localShare = getLocalShare();
  if (!localShare) {
    return { valid: false };
  }

  const share = await getShare(localShare.shareId);
  if (!share || share.editToken !== localShare.editToken) {
    // 清除无效的本地数据
    localStorage.removeItem(LOCAL_SHARE_KEY);
    return { valid: false };
  }

  return {
    valid: true,
    shareId: localShare.shareId,
    editToken: localShare.editToken
  };
};

/**
 * 清除本地分享记录（允许创建新分享）
 */
export const clearLocalShare = (): void => {
  localStorage.removeItem(LOCAL_SHARE_KEY);
};

/**
 * 保存配置到本地（排除大数据如 customUrl）
 */
export const saveLocalConfig = (config: Record<string, unknown>): void => {
  try {
    // 深拷贝并排除 music.customUrl（音乐数据单独存储到 IndexedDB）
    const configToSave = JSON.parse(JSON.stringify(config));
    if (configToSave.music && typeof configToSave.music === 'object') {
      const music = configToSave.music as Record<string, unknown>;
      // 保留 selected 为 'custom' 的标记，但不存储实际数据
      if (music.customUrl) {
        delete music.customUrl;
      }
    }
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(configToSave));
  } catch (e) {
    console.error('Failed to save config:', e);
  }
};

/**
 * 获取本地保存的配置
 */
export const getLocalConfig = (): Record<string, unknown> | null => {
  try {
    const data = localStorage.getItem(LOCAL_CONFIG_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * 保存自定义音乐到 IndexedDB
 */
export const saveLocalMusic = async (musicData: string | null): Promise<void> => {
  try {
    const db = await openPhotosDB();
    const tx = db.transaction('music', 'readwrite');
    const store = tx.objectStore('music');
    
    if (musicData) {
      await new Promise<void>((resolve, reject) => {
        const putReq = store.put({ id: 'custom', data: musicData });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    } else {
      // 清除音乐
      await new Promise<void>((resolve, reject) => {
        const deleteReq = store.delete('custom');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => reject(deleteReq.error);
      });
    }
    
    db.close();
  } catch (e) {
    console.error('Failed to save music to IndexedDB:', e);
  }
};

/**
 * 获取本地保存的自定义音乐
 */
export const getLocalMusic = async (): Promise<string | null> => {
  try {
    const db = await openPhotosDB();
    const tx = db.transaction('music', 'readonly');
    const store = tx.objectStore('music');
    
    const result = await new Promise<{ id: string; data: string } | undefined>((resolve, reject) => {
      const getReq = store.get('custom');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });
    
    db.close();
    return result?.data || null;
  } catch (e) {
    console.error('Failed to get music from IndexedDB:', e);
    return null;
  }
};

/**
 * 保存照片到本地（使用 IndexedDB 支持大容量存储）
 */
export const saveLocalPhotos = async (photos: string[]): Promise<void> => {
  try {
    // 优先使用 IndexedDB
    const db = await openPhotosDB();
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    
    // 清除旧数据
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
    
    // 存储新数据
    for (let i = 0; i < photos.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const putReq = store.put({ id: i, data: photos[i] });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    }
    
    // 存储照片数量
    await new Promise<void>((resolve, reject) => {
      const putReq = store.put({ id: 'count', data: photos.length });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
    
    db.close();
  } catch (e) {
    console.error('Failed to save photos to IndexedDB:', e);
    // 降级到 localStorage（可能会失败）
    try {
      localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));
    } catch (e2) {
      console.error('Failed to save photos to localStorage:', e2);
    }
  }
};

/**
 * 获取本地保存的照片（从 IndexedDB）
 */
export const getLocalPhotos = async (): Promise<string[]> => {
  try {
    // 优先从 IndexedDB 读取
    const db = await openPhotosDB();
    const tx = db.transaction('photos', 'readonly');
    const store = tx.objectStore('photos');
    
    // 获取照片数量
    const countData = await new Promise<{ id: string | number; data: number } | undefined>((resolve, reject) => {
      const getReq = store.get('count');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    });
    
    if (!countData || typeof countData.data !== 'number') {
      db.close();
      // 尝试从 localStorage 迁移
      return migratePhotosFromLocalStorage();
    }
    
    const photos: string[] = [];
    for (let i = 0; i < countData.data; i++) {
      const photoData = await new Promise<{ id: number; data: string } | undefined>((resolve, reject) => {
        const getReq = store.get(i);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      });
      if (photoData) {
        photos.push(photoData.data);
      }
    }
    
    db.close();
    return photos;
  } catch (e) {
    console.error('Failed to get photos from IndexedDB:', e);
    // 降级到 localStorage
    try {
      const data = localStorage.getItem(LOCAL_PHOTOS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

/**
 * 打开照片数据库（版本 2：增加音乐存储）
 */
const openPhotosDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('christmas_tree_db', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
      // 版本 2：添加音乐存储
      if (!db.objectStoreNames.contains('music')) {
        db.createObjectStore('music', { keyPath: 'id' });
      }
    };
  });
};

/**
 * 从 localStorage 迁移照片到 IndexedDB
 */
const migratePhotosFromLocalStorage = async (): Promise<string[]> => {
  try {
    const data = localStorage.getItem(LOCAL_PHOTOS_KEY);
    if (!data) return [];
    
    const photos: string[] = JSON.parse(data);
    if (photos.length > 0) {
      // 迁移到 IndexedDB
      await saveLocalPhotos(photos);
      // 清除 localStorage 中的照片数据
      localStorage.removeItem(LOCAL_PHOTOS_KEY);
      console.log('Photos migrated from localStorage to IndexedDB');
    }
    return photos;
  } catch {
    return [];
  }
};

/**
 * 续期分享（延长 7 天，最多续期 7 次）
 */
export const refreshShareExpiry = async (
  shareId: string,
  editToken: string
): Promise<{ success: boolean; newExpiresAt?: number; error?: string }> => {
  try {
    const existing = await getShare(shareId);
    if (!existing) {
      return { success: false, error: '分享不存在' };
    }
    
    if (existing.editToken !== editToken) {
      return { success: false, error: '无权操作此分享' };
    }

    // 检查续期次数（通过 refreshCount 字段）
    const refreshCount = (existing as ShareData & { refreshCount?: number }).refreshCount || 0;
    if (refreshCount >= 7) {
      return { success: false, error: '已达到最大续期次数（7次）' };
    }

    const now = Date.now();
    const newExpiresAt = now + 7 * 24 * 60 * 60 * 1000;
    
    const updatedData = {
      ...existing,
      expiresAt: newExpiresAt,
      updatedAt: now,
      refreshCount: refreshCount + 1
    };

    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error(`续期失败: ${response.status}`);
    }

    return { success: true, newExpiresAt };
  } catch (error) {
    console.error('Refresh error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '续期失败'
    };
  }
};

/**
 * 删除分享
 */
export const deleteShare = async (
  shareId: string,
  editToken: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const existing = await getShare(shareId);
    if (!existing) {
      return { success: false, error: '分享不存在' };
    }
    
    if (existing.editToken !== editToken) {
      return { success: false, error: '无权删除此分享' };
    }

    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json?token=${encodeURIComponent(editToken)}`, {
      method: 'DELETE'
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`删除失败: ${response.status}`);
    }

    // 清除本地记录
    clearLocalShare();

    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除失败'
    };
  }
};

/**
 * 将音频 Blob 转换为 Base64
 */
export const audioToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 将 Base64 转换为音频 Blob
 */
export const base64ToAudioBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'audio/webm';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
};

/**
 * 从配置中提取语音数据和自定义音乐
 * 返回 voiceUrls 数组、customMusicUrl 和清理后的配置
 */
export const extractVoiceDataFromConfig = (config: Record<string, unknown>): {
  voiceUrls: string[];
  customMusicUrl?: string;
  cleanConfig: Record<string, unknown>;
} => {
  const voiceUrls: string[] = [];
  let customMusicUrl: string | undefined;
  const cleanConfig = JSON.parse(JSON.stringify(config)); // 深拷贝
  
  // 检查 timeline.steps 中的 voice 步骤
  const timeline = cleanConfig.timeline as { steps?: Array<{ type: string; audioData?: string; audioUrl?: string }> } | undefined;
  if (timeline?.steps) {
    timeline.steps.forEach((step, index) => {
      if (step.type === 'voice' && step.audioData) {
        // 将 audioData 存储到 voiceUrls 数组
        voiceUrls[index] = step.audioData;
        // 从配置中移除 audioData，添加索引引用
        delete step.audioData;
        step.audioUrl = `voice:${index}`; // 使用特殊标记表示引用 voiceUrls
      }
    });
  }
  
  // 提取自定义音乐 base64 数据
  const music = cleanConfig.music as { selected?: string; customUrl?: string } | undefined;
  if (music?.selected === 'custom' && music.customUrl?.startsWith('data:audio/')) {
    customMusicUrl = music.customUrl;
    // 从配置中移除 customUrl，使用特殊标记
    music.customUrl = 'music:custom';
  }
  
  return { voiceUrls, customMusicUrl, cleanConfig };
};

/**
 * 将语音数据和自定义音乐还原到配置中
 */
export const restoreVoiceDataToConfig = (
  config: Record<string, unknown>,
  voiceUrls?: string[],
  customMusicUrl?: string
): Record<string, unknown> => {
  const restoredConfig = JSON.parse(JSON.stringify(config)); // 深拷贝
  
  // 还原语音数据
  if (voiceUrls && voiceUrls.length > 0) {
    const timeline = restoredConfig.timeline as { steps?: Array<{ type: string; audioData?: string; audioUrl?: string }> } | undefined;
    if (timeline?.steps) {
      timeline.steps.forEach((step) => {
        if (step.type === 'voice' && step.audioUrl?.startsWith('voice:')) {
          const voiceIndex = parseInt(step.audioUrl.split(':')[1], 10);
          if (voiceUrls[voiceIndex]) {
            step.audioData = voiceUrls[voiceIndex];
            delete step.audioUrl;
          }
        }
      });
    }
  }
  
  // 还原自定义音乐
  const music = restoredConfig.music as { selected?: string; customUrl?: string } | undefined;
  if (music) {
    if (customMusicUrl && music.customUrl === 'music:custom') {
      // 新格式：从 customMusicUrl 字段还原
      music.customUrl = customMusicUrl;
    }
    // 旧格式兼容：如果 customUrl 已经是 base64 数据，保持不变
    // （旧数据直接存在 config.music.customUrl 里）
  }
  
  return restoredConfig;
};
