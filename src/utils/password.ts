/**
 * 密码处理工具模块
 * 使用 Web Crypto API 进行 SHA-256 哈希
 */

export interface PasswordHash {
  hash: string;  // SHA-256 哈希值 (hex)
  salt: string;  // 随机盐值 (hex)
}

export interface PasswordValidation {
  valid: boolean;
  error?: string;
}

/**
 * 验证密码格式
 * 密码长度必须在 4-20 字符之间
 */
export function validatePasswordFormat(password: string): PasswordValidation {
  if (!password || password.length < 4) {
    return { valid: false, error: '密码至少需要 4 个字符' };
  }
  if (password.length > 20) {
    return { valid: false, error: '密码不能超过 20 个字符' };
  }
  return { valid: true };
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将十六进制字符串转换为 Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * 生成随机盐值 (16 字节)
 */
function generateSalt(): string {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  return bufferToHex(saltBytes.buffer);
}

/**
 * 计算密码的 SHA-256 哈希值
 * @param password 原始密码
 * @param salt 盐值 (hex)
 * @returns 哈希值 (hex)
 */
async function computeHash(password: string, salt: string): Promise<string> {
  // 将密码和盐值组合
  const encoder = new TextEncoder();
  const saltBytes = hexToBuffer(salt);
  const passwordBytes = encoder.encode(password);
  
  // 组合: salt + password
  const combined = new Uint8Array(saltBytes.length + passwordBytes.length);
  combined.set(saltBytes, 0);
  combined.set(passwordBytes, saltBytes.length);
  
  // 计算 SHA-256 哈希
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  return bufferToHex(hashBuffer);
}

/**
 * 生成密码哈希
 * @param password 原始密码
 * @returns 包含哈希值和盐值的对象
 */
export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = generateSalt();
  const hash = await computeHash(password, salt);
  return { hash, salt };
}

/**
 * 验证密码
 * @param password 待验证的密码
 * @param hash 存储的哈希值
 * @param salt 存储的盐值
 * @returns 密码是否正确
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await computeHash(password, salt);
  return computedHash === hash;
}
