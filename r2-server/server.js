/**
 * R2 存储代理服务 - 高并发优化版
 * 
 * 高并发特性：
 * - LRU 内存缓存（热门分享秒级响应）
 * - 请求合并（相同资源并发请求只查一次 R2）
 * - 连接池优化
 * - Gzip 压缩
 * - 优雅关闭
 * - 动态限流
 * 
 * 部署步骤：
 * 1. 宝塔 → 网站 → Node项目 → 添加项目
 * 2. 项目目录选择此文件夹
 * 3. 启动文件：server.js
 * 4. 端口：3001（或其他）
 * 5. 配置反向代理到你的域名
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { NodeHttpHandler } = require('@smithy/node-http-handler');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3001;

// R2 配置
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'merrychristmas'
};

// 验证环境变量
if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
  console.error('Missing required R2 environment variables');
  process.exit(1);
}

// ============ 高并发优化：连接池 ============
const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 100,        // 最大并发连接数
  maxFreeSockets: 20,     // 空闲连接数
  timeout: 30000
});

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 10000,
    socketTimeout: 30000
  }),
  maxAttempts: 3  // 自动重试
});

// ============ 高并发优化：LRU 缓存 ============
class LRUCache {
  constructor(maxSize = 500, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 检查过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    // LRU: 移到末尾
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    // 删除旧的
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 超出容量，删除最旧的
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

// 缓存实例：最多 500 个分享，每个缓存 2 分钟
const shareCache = new LRUCache(500, 120000);

// ============ 高并发优化：请求合并 ============
const pendingRequests = new Map(); // key -> Promise

async function getWithDedup(key) {
  // 如果已有相同请求在进行中，等待它完成
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // 创建新请求
  const promise = (async () => {
    try {
      const command = new GetObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key
      });
      const response = await s3Client.send(command);
      const body = await response.Body.transformToString();
      return { success: true, data: body };
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return { success: false, notFound: true };
      }
      throw error;
    } finally {
      // 请求完成后移除
      pendingRequests.delete(key);
    }
  })();
  
  pendingRequests.set(key, promise);
  return promise;
}

// ============ 限流配置（圣诞节高峰期放宽） ============
const rateLimitMap = new Map();
const uploadLimitMap = new Map();

// 动态限流：可通过环境变量调整
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),  // 提高到 100/分钟
  maxUploads: parseInt(process.env.UPLOAD_LIMIT_MAX || '10', 10)   // 提高到 10/分钟
};

function checkRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  let info = rateLimitMap.get(ip);
  if (!info || now > info.resetTime) {
    info = { count: 0, resetTime: now + RATE_LIMIT.windowMs };
  }
  
  info.count++;
  rateLimitMap.set(ip, info);
  
  // 添加限流头
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT.maxRequests - info.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));
  
  if (info.count > RATE_LIMIT.maxRequests) {
    console.log(`[RATE LIMIT] IP ${ip} exceeded ${RATE_LIMIT.maxRequests} requests/min`);
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: Math.ceil((info.resetTime - now) / 1000) 
    });
  }
  
  next();
}

function checkUploadLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  let info = uploadLimitMap.get(ip);
  if (!info || now > info.resetTime) {
    info = { count: 0, resetTime: now + RATE_LIMIT.windowMs };
  }
  
  info.count++;
  uploadLimitMap.set(ip, info);
  
  if (info.count > RATE_LIMIT.maxUploads) {
    console.log(`[UPLOAD LIMIT] IP ${ip} exceeded ${RATE_LIMIT.maxUploads} uploads/min`);
    return res.status(429).json({ 
      error: 'Too many uploads', 
      retryAfter: Math.ceil((info.resetTime - now) / 1000) 
    });
  }
  
  next();
}

// 清理过期限流记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, info] of rateLimitMap) {
    if (now > info.resetTime) rateLimitMap.delete(ip);
  }
  for (const [ip, info] of uploadLimitMap) {
    if (now > info.resetTime) uploadLimitMap.delete(ip);
  }
}, 60 * 1000);

// ============ 输入验证 ============
function validateShareId(id) {
  return /^[a-z0-9]{8}$/.test(id);
}

function validateEditToken(token) {
  return /^[A-Za-z0-9]{32}$/.test(token);
}

function validateShareData(data) {
  const errors = [];
  
  if (!data.id) errors.push('Missing id');
  if (!data.editToken) errors.push('Missing editToken');
  if (!data.createdAt) errors.push('Missing createdAt');
  
  if (data.id && !validateShareId(data.id)) {
    errors.push('Invalid id format');
  }
  
  if (data.editToken && !validateEditToken(data.editToken)) {
    errors.push('Invalid editToken format');
  }
  
  if (data.photos) {
    if (!Array.isArray(data.photos)) {
      errors.push('Photos must be an array');
    } else if (data.photos.length > 100) {
      errors.push('Too many photos (max 100)');
    } else {
      for (let i = 0; i < data.photos.length; i++) {
        const photo = data.photos[i];
        if (typeof photo !== 'string') {
          errors.push(`Photo ${i} is not a string`);
        } else if (!photo.startsWith('data:image/')) {
          errors.push(`Photo ${i} is not a valid data URL`);
        } else if (photo.length > 10 * 1024 * 1024) {
          errors.push(`Photo ${i} is too large`);
        }
      }
    }
  }
  
  if (data.message && (typeof data.message !== 'string' || data.message.length > 200)) {
    errors.push('Message too long (max 200 chars)');
  }
  
  if (data.config && typeof data.config !== 'object') {
    errors.push('Config must be an object');
  }
  
  if (data.createdAt && (typeof data.createdAt !== 'number' || data.createdAt < 0)) {
    errors.push('Invalid createdAt timestamp');
  }
  
  return errors;
}

function sanitizeForLog(data) {
  if (!data) return data;
  const sanitized = { ...data };
  if (sanitized.photos) sanitized.photos = `[${sanitized.photos.length} photos]`;
  if (sanitized.editToken) sanitized.editToken = '***';
  if (sanitized.config) sanitized.config = '[config]';
  return sanitized;
}

// ============ 中间件 ============

// 信任代理（宝塔反向代理）
app.set('trust proxy', true);

// Gzip 压缩
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// 全局限流
app.use(checkRateLimit);

// 请求日志（简化版，高并发时减少 IO）
const LOG_SAMPLE_RATE = parseFloat(process.env.LOG_SAMPLE_RATE || '1'); // 1 = 100% 记录
app.use((req, res, next) => {
  if (Math.random() < LOG_SAMPLE_RATE) {
    const ip = req.ip || 'unknown';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${ip}`);
  }
  next();
});

// ============ 路由 ============

// 健康检查 + 状态
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    cache: {
      size: shareCache.size,
      maxSize: shareCache.maxSize
    },
    pending: pendingRequests.size,
    rateLimit: RATE_LIMIT
  });
});

// GET - 读取文件（带缓存）
app.get('/shares/:id.json', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!validateShareId(id)) {
      return res.status(400).json({ error: 'Invalid share ID format' });
    }
    
    const key = `shares/${id}.json`;
    
    // 1. 先查缓存
    const cached = shareCache.get(key);
    if (cached) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached);
    }
    
    // 2. 缓存未命中，查 R2（带请求合并）
    const result = await getWithDedup(key);
    
    if (result.notFound) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    if (!result.success) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    // 3. 存入缓存
    shareCache.set(key, result.data);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('X-Cache', 'MISS');
    res.send(result.data);
  } catch (error) {
    console.error('[GET ERROR]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT - 上传/更新文件
app.put('/shares/:id.json', checkUploadLimit, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!validateShareId(id)) {
      return res.status(400).json({ error: 'Invalid share ID format' });
    }
    
    const key = `shares/${id}.json`;
    let body = req.body;
    
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    }
    
    const validationErrors = validateShareData(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: validationErrors });
    }
    
    if (body.id !== id) {
      return res.status(400).json({ error: 'ID mismatch' });
    }
    
    // 检查是否更新，验证 token
    try {
      const result = await getWithDedup(key);
      if (result.success) {
        const existingData = JSON.parse(result.data);
        if (existingData.editToken !== body.editToken) {
          console.log('[AUTH ERROR] Token mismatch:', id);
          return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log('[UPDATE]', sanitizeForLog(body));
      }
    } catch (error) {
      if (error.name !== 'NoSuchKey') throw error;
      console.log('[CREATE]', sanitizeForLog(body));
    }
    
    // 上传到 R2
    const putCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: JSON.stringify(body),
      ContentType: 'application/json'
    });
    
    await s3Client.send(putCommand);
    
    // 更新缓存
    shareCache.set(key, JSON.stringify(body));
    
    res.json({ success: true });
  } catch (error) {
    console.error('[PUT ERROR]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE - 删除文件
app.delete('/shares/:id.json', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token;
    
    if (!validateShareId(id)) {
      return res.status(400).json({ error: 'Invalid share ID format' });
    }
    
    if (!token || !validateEditToken(token)) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const key = `shares/${id}.json`;
    
    // 验证 token
    const result = await getWithDedup(key);
    if (result.notFound) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    const existingData = JSON.parse(result.data);
    if (existingData.editToken !== token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // 删除
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key
    });
    
    await s3Client.send(deleteCommand);
    
    // 清除缓存
    shareCache.delete(key);
    
    console.log('[DELETE]', id);
    res.json({ success: true });
  } catch (error) {
    console.error('[DELETE ERROR]', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 缓存管理（可选，用于紧急清理）
app.post('/admin/cache/clear', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  shareCache.clear();
  console.log('[ADMIN] Cache cleared');
  res.json({ success: true, message: 'Cache cleared' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ 优雅关闭 ============
let isShuttingDown = false;

const server = app.listen(PORT, () => {
  console.log(`\n🎄 R2 Proxy Server (High Concurrency Edition)`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Bucket: ${R2_CONFIG.bucketName}`);
  console.log(`   Cache: ${shareCache.maxSize} items, ${shareCache.ttlMs / 1000}s TTL`);
  console.log(`   Rate Limit: ${RATE_LIMIT.maxRequests} req/min, ${RATE_LIMIT.maxUploads} uploads/min`);
  console.log(`   Max Connections: ${httpsAgent.maxSockets}\n`);
});

// 设置服务器超时
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n[${signal}] Graceful shutdown started...`);
  
  // 停止接受新连接
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');
    
    // 清理资源
    httpsAgent.destroy();
    shareCache.clear();
    
    console.log('[SHUTDOWN] Complete');
    process.exit(0);
  });
  
  // 强制退出超时
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
