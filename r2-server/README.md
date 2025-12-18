# R2 代理服务 - 宝塔部署指南

## 概述

这是一个 Node.js 服务，用于代理 Cloudflare R2 存储的上传请求。

> **注意**：推荐使用 `cloudflare-worker/` 中的 Cloudflare Worker 方案，无需服务器，更简单。

## 宝塔部署步骤

### 1. 上传文件

将 `r2-server` 文件夹上传到服务器，例如：
```
/www/wwwroot/r2-api.your-domain.com/
```

### 2. 安装依赖

```bash
cd /www/wwwroot/r2-api.your-domain.com
npm install
```

### 3. 创建 Node 项目

1. 宝塔面板 → **网站** → **Node项目** → **添加Node项目**
2. 配置：
   - 项目目录：`/www/wwwroot/r2-api.your-domain.com`
   - 启动文件：`server.js`
   - 项目端口：`3001`
   - 运行用户：`www`

### 4. 配置环境变量（必须）

在宝塔 Node 项目设置中添加环境变量：

```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
```

### 5. 配置反向代理

1. 宝塔 → **网站** → **添加站点**
2. 域名：`r2-api.your-domain.com`
3. 添加后 → **设置** → **反向代理** → **添加反向代理**
4. 配置：
   - 代理名称：`r2-api`
   - 目标URL：`http://127.0.0.1:3001`
   - 发送域名：`$host`

### 6. 配置 SSL

1. 站点设置 → **SSL** → **Let's Encrypt**
2. 申请免费证书
3. 开启强制 HTTPS

### 7. 配置 DNS

在你的 DNS 服务商添加记录：
- 类型：`A`
- 名称：`r2-api`
- 内容：你的服务器 IP

## 测试

```bash
# 健康检查
curl https://r2-api.your-domain.com/health

# 测试上传
curl -X PUT https://r2-api.your-domain.com/shares/testid01.json \
  -H "Content-Type: application/json" \
  -d '{"id":"testid01","editToken":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx","createdAt":1734400000000}'

# 测试读取
curl https://r2-api.your-domain.com/shares/testid01.json
```

## 更新前端配置

部署成功后，修改前端 `.env`：

```env
VITE_R2_API_URL=https://r2-api.your-domain.com
VITE_R2_PUBLIC_URL=https://r2-api.your-domain.com
```

## 注意事项

1. **安全**：必须将密钥放在环境变量中，不要硬编码
2. **CORS**：已配置允许所有来源，如需限制可修改 `server.js`
3. **文件大小**：限制 10MB，可在 `server.js` 中调整
4. **日志**：宝塔会自动管理 Node 项目日志
