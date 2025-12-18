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
}

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

    const shareData: ShareData = {
      id: shareId,
      editToken,
      photos,
      config,
      message,
      createdAt: now,
      updatedAt: now,
      expiresAt
    };

    // 上传到 R2（通过 Worker 代理）
    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shareData)
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
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
    // 先获取现有数据验证 token
    const existing = await getShare(shareId);
    if (!existing) {
      return { success: false, error: '分享不存在' };
    }
    
    if (existing.editToken !== editToken) {
      return { success: false, error: '无权编辑此分享' };
    }

    const now = Date.now();
    const updatedData: ShareData = {
      ...existing,
      photos,
      config,
      message,
      updatedAt: now
    };

    const response = await fetch(`${R2_API_URL}/shares/${shareId}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      throw new Error(`更新失败: ${response.status}`);
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
    const response = await fetch(`${R2_PUBLIC_URL}/shares/${shareId}.json`);
    
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
 * 保存配置到本地
 */
export const saveLocalConfig = (config: Record<string, unknown>): void => {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
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
 * 保存照片到本地
 */
export const saveLocalPhotos = (photos: string[]): void => {
  try {
    localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(photos));
  } catch (e) {
    console.error('Failed to save photos:', e);
  }
};

/**
 * 获取本地保存的照片
 */
export const getLocalPhotos = (): string[] => {
  try {
    const data = localStorage.getItem(LOCAL_PHOTOS_KEY);
    return data ? JSON.parse(data) : [];
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
