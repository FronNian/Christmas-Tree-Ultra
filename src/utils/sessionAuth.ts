/**
 * 会话验证工具
 * 用于在 sessionStorage 中存储和检查分享密码验证状态
 */

const SESSION_KEY_PREFIX = 'share_verified_';

export interface SessionVerification {
  shareId: string;
  verifiedAt: number;  // timestamp
}

/**
 * 获取存储键名
 */
function getStorageKey(shareId: string): string {
  return `${SESSION_KEY_PREFIX}${shareId}`;
}

/**
 * 存储验证状态
 * @param shareId 分享 ID
 */
export function saveVerification(shareId: string): void {
  try {
    const verification: SessionVerification = {
      shareId,
      verifiedAt: Date.now()
    };
    sessionStorage.setItem(getStorageKey(shareId), JSON.stringify(verification));
  } catch (e) {
    console.error('Failed to save verification to sessionStorage:', e);
  }
}

/**
 * 检查验证状态
 * @param shareId 分享 ID
 * @returns 是否已验证
 */
export function checkVerification(shareId: string): boolean {
  try {
    const data = sessionStorage.getItem(getStorageKey(shareId));
    if (!data) return false;
    
    const verification: SessionVerification = JSON.parse(data);
    // 验证 shareId 匹配
    return verification.shareId === shareId;
  } catch (e) {
    console.error('Failed to check verification from sessionStorage:', e);
    return false;
  }
}

/**
 * 清除验证状态
 * @param shareId 分享 ID
 */
export function clearVerification(shareId: string): void {
  try {
    sessionStorage.removeItem(getStorageKey(shareId));
  } catch (e) {
    console.error('Failed to clear verification from sessionStorage:', e);
  }
}
