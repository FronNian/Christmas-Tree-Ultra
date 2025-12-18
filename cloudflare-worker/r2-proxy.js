/**
 * Cloudflare Worker - R2 存储代理
 * 
 * 部署步骤：
 * 1. Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. 复制此代码到 Worker 编辑器
 * 3. Settings → Variables → 添加 R2 Bucket 绑定，变量名: R2_BUCKET
 * 4. 绑定自定义域名: r2-api.your-domain.com
 * 5. 删除 DNS 中 r2-api 的 A 记录（如有）
 */

// 请求频率限制（使用 KV 存储，需要绑定 KV namespace: RATE_LIMIT）
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 30,
  maxUploads: 5
};

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
    } else if (data.photos.length > 20) {
      errors.push('Too many photos (max 20)');
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
  
  return errors;
}

// 响应辅助函数
function jsonResponse(data, status = 200, extraHeaders = {}) {
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
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
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
      return handleOptions();
    }

    // 健康检查
    if (path === '/health' && method === 'GET') {
      return jsonResponse({ status: 'ok', time: new Date().toISOString() });
    }

    // 解析路径: /shares/{id}.json
    const shareMatch = path.match(/^\/shares\/([a-z0-9]+)\.json$/);
    if (!shareMatch) {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    const id = shareMatch[1];
    
    // 验证 ID 格式
    if (!validateShareId(id)) {
      return jsonResponse({ error: 'Invalid share ID format' }, 400);
    }

    const key = `shares/${id}.json`;

    try {
      // GET - 读取分享
      if (method === 'GET') {
        const object = await env.R2_BUCKET.get(key);
        
        if (!object) {
          return jsonResponse({ error: 'Not found' }, 404);
        }

        const data = await object.text();
        return new Response(data, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            ...corsHeaders,
            ...securityHeaders,
          },
        });
      }

      // PUT - 创建/更新分享
      if (method === 'PUT') {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return jsonResponse({ error: 'Invalid JSON' }, 400);
        }

        // 验证数据
        const validationErrors = validateShareData(body);
        if (validationErrors.length > 0) {
          return jsonResponse({ error: 'Validation failed', details: validationErrors }, 400);
        }

        // ID 一致性检查
        if (body.id !== id) {
          return jsonResponse({ error: 'ID mismatch' }, 400);
        }

        // 检查是否是更新操作
        const existing = await env.R2_BUCKET.get(key);
        if (existing) {
          const existingData = await existing.json();
          if (existingData.editToken !== body.editToken) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
          }
        }

        // 上传到 R2
        await env.R2_BUCKET.put(key, JSON.stringify(body), {
          httpMetadata: { contentType: 'application/json' },
        });

        return jsonResponse({ success: true });
      }

      // DELETE - 删除分享
      if (method === 'DELETE') {
        const token = url.searchParams.get('token');
        
        if (!token) {
          return jsonResponse({ error: 'Token required' }, 401);
        }

        if (!validateEditToken(token)) {
          return jsonResponse({ error: 'Invalid token format' }, 400);
        }

        // 验证 token
        const existing = await env.R2_BUCKET.get(key);
        if (!existing) {
          return jsonResponse({ error: 'Not found' }, 404);
        }

        const existingData = await existing.json();
        if (existingData.editToken !== token) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }

        await env.R2_BUCKET.delete(key);
        return jsonResponse({ success: true });
      }

      return jsonResponse({ error: 'Method not allowed' }, 405);
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};
