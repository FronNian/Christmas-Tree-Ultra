import * as THREE from 'three';
import type { DecorationStyle } from '../../types';

// 几何体缓存
const geometryCache: Map<string, THREE.BufferGeometry> = new Map();

// 创建钻石几何体（圆锥 + 倒圆锥）
const createDiamondGeometry = (): THREE.BufferGeometry => {
  const key = 'diamond';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  const topCone = new THREE.ConeGeometry(0.5, 0.6, 8);
  const bottomCone = new THREE.ConeGeometry(0.5, 0.3, 8);
  
  // 翻转底部圆锥
  bottomCone.rotateX(Math.PI);
  bottomCone.translate(0, -0.15, 0);
  topCone.translate(0, 0.15, 0);
  
  // 合并几何体
  const merged = new THREE.BufferGeometry();
  const topPositions = topCone.getAttribute('position').array;
  const bottomPositions = bottomCone.getAttribute('position').array;
  
  const positions = new Float32Array(topPositions.length + bottomPositions.length);
  positions.set(topPositions, 0);
  positions.set(bottomPositions, topPositions.length);
  
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  
  topCone.dispose();
  bottomCone.dispose();
  
  geometryCache.set(key, merged);
  return merged;
};

// 创建心形几何体
const createHeartGeometry = (): THREE.BufferGeometry => {
  const key = 'heart';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  const shape = new THREE.Shape();
  const x = 0, y = 0;
  shape.moveTo(x, y + 0.25);
  shape.bezierCurveTo(x, y + 0.25, x - 0.25, y, x - 0.25, y);
  shape.bezierCurveTo(x - 0.55, y, x - 0.55, y + 0.35, x - 0.55, y + 0.35);
  shape.bezierCurveTo(x - 0.55, y + 0.55, x - 0.35, y + 0.77, x, y + 1);
  shape.bezierCurveTo(x + 0.35, y + 0.77, x + 0.55, y + 0.55, x + 0.55, y + 0.35);
  shape.bezierCurveTo(x + 0.55, y + 0.35, x + 0.55, y, x + 0.25, y);
  shape.bezierCurveTo(x + 0.1, y, x, y + 0.25, x, y + 0.25);
  
  const extrudeSettings = {
    depth: 0.2,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.05,
    bevelThickness: 0.05
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.center();
  geometry.scale(0.8, 0.8, 0.8);
  
  geometryCache.set(key, geometry);
  return geometry;
};

// 创建六角雪花几何体
const createSnowflakeGeometry = (): THREE.BufferGeometry => {
  const key = 'snowflake';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  const shape = new THREE.Shape();
  const arms = 6;
  const innerRadius = 0.15;
  const outerRadius = 0.5;
  
  for (let i = 0; i < arms * 2; i++) {
    const angle = (i * Math.PI) / arms;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: false
  });
  geometry.center();
  
  geometryCache.set(key, geometry);
  return geometry;
};

// 创建五角星几何体
const createStarGeometry = (): THREE.BufferGeometry => {
  const key = 'star';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  const shape = new THREE.Shape();
  const points = 5;
  const outerRadius = 0.5;
  const innerRadius = 0.2;
  
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.15,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03
  });
  geometry.center();
  
  geometryCache.set(key, geometry);
  return geometry;
};

// 创建松果几何体（多层圆锥）
const createPineconeGeometry = (): THREE.BufferGeometry => {
  const key = 'pinecone';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  // 使用椭球体近似松果形状
  const geometry = new THREE.SphereGeometry(0.35, 8, 12);
  geometry.scale(1, 1.5, 1);
  
  geometryCache.set(key, geometry);
  return geometry;
};

// 创建冰晶几何体（六角棱柱）
const createIceCrystalGeometry = (): THREE.BufferGeometry => {
  const key = 'iceCrystal';
  if (geometryCache.has(key)) return geometryCache.get(key)!;
  
  const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 6);
  
  geometryCache.set(key, geometry);
  return geometry;
};

// 获取样式对应的几何体列表
export const getGeometriesForStyle = (style: DecorationStyle): THREE.BufferGeometry[] => {
  switch (style) {
    case 'classic':
      return [
        new THREE.BoxGeometry(0.8, 0.8, 0.8),           // 方块
        new THREE.SphereGeometry(0.5, 16, 16),          // 球体
        new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8)  // 糖果棒
      ];
    
    case 'crystal':
      return [
        new THREE.OctahedronGeometry(0.5),              // 八面体
        new THREE.IcosahedronGeometry(0.45),            // 二十面体
        createIceCrystalGeometry()                       // 六角棱柱
      ];
    
    case 'gem':
      return [
        createDiamondGeometry(),                         // 钻石
        new THREE.DodecahedronGeometry(0.45),           // 十二面体（祖母绿切割）
        createHeartGeometry()                            // 心形
      ];
    
    case 'nature':
      return [
        createPineconeGeometry(),                        // 松果
        createSnowflakeGeometry(),                       // 雪花
        new THREE.TetrahedronGeometry(0.5)              // 四面体（冰晶）
      ];
    
    case 'modern':
      return [
        createStarGeometry(),                            // 五角星
        new THREE.DodecahedronGeometry(0.4),            // 十二面体
        new THREE.TorusGeometry(0.35, 0.12, 8, 16)      // 圆环
      ];
    
    default:
      return [
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8)
      ];
  }
};

// 样式名称映射
export const DECORATION_STYLE_NAMES: Record<DecorationStyle, string> = {
  classic: '🎄 经典圣诞',
  crystal: '💎 水晶',
  gem: '💍 宝石',
  nature: '🌲 自然',
  modern: '✨ 现代'
};

// 样式描述
export const DECORATION_STYLE_DESCRIPTIONS: Record<DecorationStyle, string> = {
  classic: '方块、球体、糖果棒',
  crystal: '八面体、菱形、棱柱',
  gem: '钻石、祖母绿、心形',
  nature: '松果、雪花、冰晶',
  modern: '星形、多面体、环形'
};

// 清理几何体缓存
export const disposeGeometryCache = () => {
  geometryCache.forEach(geo => geo.dispose());
  geometryCache.clear();
};

// 材质类型名称映射
export const DECORATION_MATERIAL_NAMES: Record<import('../../types').DecorationMaterial, string> = {
  standard: '标准',
  glass: '玻璃透明',
  metallic: '金属光泽',
  emissive: '自发光'
};
