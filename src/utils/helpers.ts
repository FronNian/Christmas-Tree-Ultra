import { CONFIG } from '../config';

// 检测是否为移动端
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768;
};

// 生成树形位置（支持可选的种子随机参数）
export const getTreePosition = (seed1?: number, seed2?: number): [number, number, number] => {
  const h = CONFIG.tree.height;
  const rBase = CONFIG.tree.radius;
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

// 图片转 base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
