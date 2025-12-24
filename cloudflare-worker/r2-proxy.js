/**
 * Cloudflare Worker - R2 存储代理（高并发优化版）
 * 
 * 高并发特性：
 * - Cloudflare Cache API 边缘缓存
 * - 自动全球扩展
 * - 圣诞节高峰期限流放宽
 * 
 * 部署步骤：
 * 1. Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. 复制此代码到 Worker 编辑器
 * 3. Settings → Variables → 添加 R2 Bucket 绑定，变量名: R2_BUCKET
 * 4. 绑定自定义域名: r2-api.your-domain.com
 */

// 缓存配置
const CACHE_CONFIG = {
  enabled: true,
  ttlSeconds: 120,  // 缓存 2 分钟
};

// 请求频率限制（圣诞节高峰期放宽）
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 100,  // 提高到 100/分钟
  maxUploads: 15     // 提高到 15/分钟
};

// 允许的来源域名
const ALLOWED_ORIGINS = [
  'https://xxx.xxx.com',
  'https://r2-api.xxx.com'
];

// 获取 CORS 头（根据请求来源动态设置）
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// 安全响应头
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// 验证函数
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
        } else if (photo.length > 0 && !photo.startsWith('data:image/') && !photo.startsWith('http')) {
          // 允许空字符串、data:image/ 开头的 base64、或 http(s) URL
          errors.push(`Photo ${i} is not a valid data URL or URL`);
        } else if (photo.length > 10 * 1024 * 1024) {
          errors.push(`Photo ${i} is too large`);
        }
      }
    }
  }
  
  if (data.message && typeof data.message !== 'string') {
    errors.push('Message must be a string');
  } else if (data.message && data.message.length > 500) {
    // 放宽消息长度限制到 500 字符
    errors.push('Message too long (max 500 chars)');
  }
  
  if (data.config && typeof data.config !== 'object') {
    errors.push('Config must be an object');
  }
  
  return errors;
}

// 响应辅助函数
function jsonResponse(data, status = 200, request = null, extraHeaders = {}) {
  const corsHeaders = request ? getCorsHeaders(request) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] };
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...securityHeaders,
      ...extraHeaders,
    },
  });
}

// 处理 OPTIONS 预检请求
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// 主处理函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 处理 CORS 预检
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    // 来源验证（非 OPTIONS 请求）
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    
    // 如果有 Origin 头，必须在白名单中
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Forbidden' }, 403, request);
    }
    
    // 如果有 Referer，检查域名
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = refererUrl.origin;
        if (!ALLOWED_ORIGINS.includes(refererOrigin)) {
          return jsonResponse({ error: 'Forbidden' }, 403, request);
        }
      } catch (e) {
        // 无效的 Referer
      }
    }

    // 健康检查
    if (path === '/health' && method === 'GET') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() }, 200, request);
    }

    // 解析路径: /shares/{id}.json
    const shareMatch = path.match(/^\/shares\/([a-z0-9]+)\.json$/);
    if (!shareMatch) {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    const id = shareMatch[1];
    
    // 验证 ID 格式
    if (!validateShareId(id)) {
      return jsonResponse({ error: 'Invalid share ID format' }, 400, request);
    }

    const key = `shares/${id}.json`;
    const corsHeaders = getCorsHeaders(request);

    try {
      // GET - 读取分享（带边缘缓存）
      if (method === 'GET') {
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), { method: 'GET' });
        
        // 1. 先查边缘缓存
        if (CACHE_CONFIG.enabled) {
          const cachedResponse = await cache.match(cacheKey);
          if (cachedResponse) {
            // 缓存命中，添加标记头返回
            const response = new Response(cachedResponse.body, cachedResponse);
            response.headers.set('X-Cache', 'HIT');
            response.headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
            return response;
          }
        }
        
        // 2. 缓存未命中，查 R2
        const object = await env.R2_BUCKET.get(key);
        
        if (!object) {
          return jsonResponse({ error: 'Not found' }, 404, request);
        }

        const data = await object.text();
        const response = new Response(data, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_CONFIG.ttlSeconds}`,
            'X-Cache': 'MISS',
            ...corsHeaders,
            ...securityHeaders,
          },
        });
        
        // 3. 存入边缘缓存（异步，不阻塞响应）
        if (CACHE_CONFIG.enabled) {
          const responseToCache = response.clone();
          ctx.waitUntil(cache.put(cacheKey, responseToCache));
        }
        
        return response;
      }

      // PUT - 创建/更新分享
      if (method === 'PUT') {
        // 请求大小限制 (15MB)
        const contentLength = request.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) > 15 * 1024 * 1024) {
          return jsonResponse({ error: 'Request too large' }, 413, request);
        }

        let body;
        try {
          body = await request.json();
        } catch (e) {
          return jsonResponse({ error: 'Invalid JSON' }, 400, request);
        }

        // 验证数据
        const validationErrors = validateShareData(body);
        if (validationErrors.length > 0) {
          return jsonResponse({ error: 'Validation failed', details: validationErrors }, 400, request);
        }

        // ID 一致性检查
        if (body.id !== id) {
          return jsonResponse({ error: 'ID mismatch' }, 400, request);
        }

        // 检查是否是更新操作
        const existing = await env.R2_BUCKET.get(key);
        if (existing) {
          const existingData = await existing.json();
          if (existingData.editToken !== body.editToken) {
            return jsonResponse({ error: 'Unauthorized' }, 401, request);
          }
        }

        // 上传到 R2
        await env.R2_BUCKET.put(key, JSON.stringify(body), {
          httpMetadata: { contentType: 'application/json' },
        });
        
        // 清除该资源的边缘缓存
        if (CACHE_CONFIG.enabled) {
          const cache = caches.default;
          const cacheKey = new Request(`${url.origin}/shares/${id}.json`, { method: 'GET' });
          ctx.waitUntil(cache.delete(cacheKey));
        }

        return jsonResponse({ success: true }, 200, request);
      }

      // DELETE - 删除分享
      if (method === 'DELETE') {
        const token = url.searchParams.get('token');
        
        if (!token) {
          return jsonResponse({ error: 'Token required' }, 401, request);
        }

        if (!validateEditToken(token)) {
          return jsonResponse({ error: 'Invalid token format' }, 400, request);
        }

        // 验证 token
        const existing = await env.R2_BUCKET.get(key);
        if (!existing) {
          return jsonResponse({ error: 'Not found' }, 404, request);
        }

        const existingData = await existing.json();
        if (existingData.editToken !== token) {
          return jsonResponse({ error: 'Unauthorized' }, 401, request);
        }

        await env.R2_BUCKET.delete(key);
        
        // 清除该资源的边缘缓存
        if (CACHE_CONFIG.enabled) {
          const cache = caches.default;
          const cacheKey = new Request(`${url.origin}/shares/${id}.json`, { method: 'GET' });
          ctx.waitUntil(cache.delete(cacheKey));
        }
        
        return jsonResponse({ success: true }, 200, request);
      }

      return jsonResponse({ error: 'Method not allowed' }, 405, request);
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500, request);
    }
  },
};
