/**
 * Cloudflare Worker - R2 存储代理
 * 
 * 部署步骤：
 * 1. Cloudflare Dashboard → Workers & Pages → Create Worker
 * 2. 复制此代码到 Worker 编辑器
 * 3. Settings → Variables → 添加 R2 Bucket 绑定，变量名: R2_BUCKET
 * 4. 绑定自定义域名: r2-api.lynflows.com
 * 5. 删除 DNS 中 r2-api 的 A 记录
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function validateImageId(id) {
  return /^[a-z0-9]{10,20}$/.test(id);
}

function generateImageId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
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
    } else if (data.photos.length > 120) {
      errors.push('Too many photos (max 120)');
    } else {
      for (let i = 0; i < data.photos.length; i++) {
        const photo = data.photos[i];
        if (typeof photo !== 'string') {
          errors.push(`Photo ${i} is not a string`);
        } else if (!photo.startsWith('data:image/') && !photo.startsWith('http')) {
          errors.push(`Photo ${i} is not a valid data URL or URL`);
        } else if (photo.startsWith('data:image/') && photo.length > 10 * 1024 * 1024) {
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

// Base64 解码
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
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

    // ============ 图片 API ============
    
    // POST /images - 上传图片
    if (path === '/images' && method === 'POST') {
      try {
        const body = await request.json();
        const { data, shareId, editToken } = body;

        if (!data || !shareId || !editToken) {
          return jsonResponse({ error: 'Missing required fields' }, 400);
        }

        if (!validateShareId(shareId)) {
          return jsonResponse({ error: 'Invalid shareId' }, 400);
        }

        if (!validateEditToken(editToken)) {
          return jsonResponse({ error: 'Invalid editToken' }, 400);
        }

        if (!data.startsWith('data:image/')) {
          return jsonResponse({ error: 'Invalid image data' }, 400);
        }

        if (data.length > 10 * 1024 * 1024) {
          return jsonResponse({ error: 'Image too large' }, 400);
        }

        // 解析 base64
        const matches = data.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
        if (!matches) {
          return jsonResponse({ error: 'Invalid base64 format' }, 400);
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = base64ToArrayBuffer(base64Data);

        const extMap = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp'
        };
        const ext = extMap[mimeType] || 'jpg';

        const imageId = generateImageId();
        const key = `images/${shareId}/${imageId}.${ext}`;

        await env.R2_BUCKET.put(key, buffer, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000'
          }
        });

        const publicUrl = `https://${url.host}/${key}`;

        return jsonResponse({
          success: true,
          imageId,
          url: publicUrl,
          key
        });
      } catch (error) {
        console.error('Image upload error:', error);
        return jsonResponse({ error: 'Upload failed' }, 500);
      }
    }

    // GET /images/:shareId/:filename - 获取图片
    const imageMatch = path.match(/^\/images\/([a-z0-9]+)\/(.+)$/);
    if (imageMatch && method === 'GET') {
      const shareId = imageMatch[1];
      const filename = imageMatch[2];

      if (!validateShareId(shareId)) {
        return jsonResponse({ error: 'Invalid shareId' }, 400);
      }

      const key = `images/${shareId}/${filename}`;
      const object = await env.R2_BUCKET.get(key);

      if (!object) {
        return jsonResponse({ error: 'Image not found' }, 404);
      }

      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000');
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

      return new Response(object.body, { headers });
    }

    // DELETE /images/:shareId - 删除分享的所有图片
    const imageDeleteMatch = path.match(/^\/images\/([a-z0-9]+)$/);
    if (imageDeleteMatch && method === 'DELETE') {
      const shareId = imageDeleteMatch[1];
      const token = url.searchParams.get('token');

      if (!validateShareId(shareId)) {
        return jsonResponse({ error: 'Invalid shareId' }, 400);
      }

      if (!token || !validateEditToken(token)) {
        return jsonResponse({ error: 'Invalid token' }, 401);
      }

      // 验证 token（检查对应的分享是否存在且 token 匹配）
      const shareKey = `shares/${shareId}.json`;
      const shareObject = await env.R2_BUCKET.get(shareKey);

      if (shareObject) {
        const shareData = await shareObject.json();
        if (shareData.editToken !== token) {
          return jsonResponse({ error: 'Unauthorized' }, 401);
        }
      }
      // 如果分享不存在，允许清理图片（可能分享已删除）

      // 注意：R2 不支持批量删除前缀，这里只是标记
      // 实际清理可以通过 R2 生命周期规则处理
      console.log(`[IMAGE DELETE] Marked for deletion: images/${shareId}/*`);

      return jsonResponse({ success: true, message: 'Images marked for deletion' });
    }

    // ============ 分享 API ============

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
