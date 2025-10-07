# Behind Memory 中国版部署指南

本文档详细说明如何从零开始部署Behind Memory的中国大陆版本到腾讯云服务器。

## 目录

- [前置要求](#前置要求)
- [服务注册与配置](#服务注册与配置)
- [服务器配置](#服务器配置)
- [代码部署](#代码部署)
- [环境变量配置](#环境变量配置)
- [域名与SSL配置](#域名与ssl配置)
- [常见问题](#常见问题)

---

## 前置要求

### 必需账号

1. **腾讯云账号** - https://cloud.tencent.com
2. **域名** - 已备案的.cn域名（本项目使用 `behindmemory.cn`）
3. **GitHub账号** - 用于代码管理
4. **Neon数据库账号** - https://neon.tech （或其他PostgreSQL数据库）
5. **Upstash账号** - https://upstash.com （Redis服务）
6. **MiniMax账号** - https://minimax.chat （AI服务）

### 本地环境

- SSH客户端（终端）
- Git
- 代码编辑器（可选）

---

## 服务注册与配置

### 1. 腾讯云轻量应用服务器

#### 购买服务器

1. 登录腾讯云控制台：https://console.cloud.tencent.com/lighthouse
2. 点击"新建"购买轻量应用服务器
3. 推荐配置：
   - **地域**：选择离目标用户最近的区域（如北京、上海）
   - **镜像**：Ubuntu 22.04 LTS 或 24.04 LTS
   - **套餐**：2核4G（¥699/年）
   - **带宽**：5Mbps或以上
4. 记录服务器的**公网IP地址**

#### 配置SSH密钥

1. 在控制台生成或上传SSH密钥
2. 下载私钥文件（如 `dev.pem`）
3. 设置私钥权限：
   ```bash
   chmod 600 /path/to/dev.pem
   ```

**配置示例**：
- IP: `your_server_ip`
- 用户名: `ubuntu`
- SSH密钥: `your_key.pem`

### 2. 腾讯云COS（对象存储）

#### 创建存储桶

1. 访问COS控制台：https://console.cloud.tencent.com/cos
2. 点击"创建存储桶"
3. 配置：
   - **名称**：behindmemory-cn（会自动添加APPID后缀）
   - **地域**：ap-beijing（北京）
   - **访问权限**：公有读私有写
   - **存储类型**：标准存储

**配置示例**：
```
TENCENT_COS_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxx
TENCENT_COS_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_COS_BUCKET=your-bucket-name-appid
TENCENT_COS_REGION=ap-beijing
TENCENT_COS_DOMAIN=https://your-bucket-name-appid.cos.ap-beijing.myqcloud.com
```

#### 获取访问密钥

1. 访问密钥管理：https://console.cloud.tencent.com/cam/capi
2. 点击"新建密钥"
3. 记录 `SecretId` 和 `SecretKey`

### 3. Neon数据库（PostgreSQL）

1. 访问 https://neon.tech 并注册/登录
2. 创建新项目或使用现有项目
3. 获取数据库连接字符串

**配置示例**：
```
DATABASE_URL=postgres://username:password@your-host.neon.tech/dbname?sslmode=require
```

> 💡 **提示**：生产环境建议使用国内数据库（如腾讯云MySQL/PostgreSQL）以提升性能

### 4. Upstash Redis

1. 访问 https://upstash.com 并注册
2. 创建新的Redis数据库
3. 选择区域（推荐选择亚洲区域）
4. 获取连接信息

**配置示例**：
```
KV_REST_API_URL=https://your-redis.upstash.io
KV_REST_API_TOKEN=your_upstash_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token_here
```

### 5. MiniMax AI

1. 访问 https://minimax.chat 注册账号
2. 创建API密钥
3. 记录API Key

**配置示例**：
```
MINIMAX_API_KEY=your_minimax_api_key_here
```

### 6. 邮件服务（Gmail SMTP）

使用Gmail发送验证邮件：

1. 启用Gmail的两步验证
2. 生成应用专用密码：https://myaccount.google.com/apppasswords
3. 记录应用密码

**配置示例**：
```
EMAIL_FROM=your_email@gmail.com
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_USER=your_email@gmail.com
EMAIL_SERVER_PASSWORD=your_gmail_app_password
EMAIL_SERVER_PORT=587
```

### 7. 其他API（可选）

- **Gemini API**: https://makersuite.google.com/app/apikey
- **Replicate API**: https://replicate.com/account/api-tokens
- **Google Maps API**: https://console.cloud.google.com/apis/credentials
- **Google Translate API**: https://console.cloud.google.com/apis/credentials

---

## 服务器配置

### 1. 连接到服务器

```bash
ssh -i /path/to/your_key.pem ubuntu@your_server_ip
```

### 2. 安装Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

### 3. 安装Docker Compose

```bash
# Docker Compose已作为Docker插件安装
docker compose version
```

### 4. 安装Nginx

```bash
# 安装Nginx
sudo apt install nginx -y

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证
sudo systemctl status nginx
```

### 5. 安装Certbot（SSL证书工具）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 验证安装
certbot --version
```

---

## 代码部署

### 方案一：从GitHub拉取（推荐）

```bash
# 安装Git
sudo apt install git -y

# 克隆仓库
git clone https://github.com/messsiii/behindmemo.git
cd behindmemo
```

### 方案二：从本地上传

如果服务器访问GitHub较慢，可以从本地打包上传：

```bash
# 在本地机器执行（macOS/Linux）
# 清理Mac隐藏文件
find . -name '._*' -type f -delete
find . -name '.DS_Store' -delete

# 打包代码
tar --exclude='.git' --exclude='node_modules' --exclude='.next' -czf behindmemo.tar.gz .

# 上传到服务器
scp -i /path/to/your_key.pem behindmemo.tar.gz ubuntu@your_server_ip:~/

# 在服务器上解压
mkdir -p ~/behindmemory
tar -xzf behindmemo.tar.gz -C ~/behindmemory
cd ~/behindmemory
```

---

## 环境变量配置

### 1. 创建生产环境配置文件

在服务器的项目目录创建 `.env.production` 文件：

```bash
cd ~/behindmemory
nano .env.production
```

### 2. 填写环境变量

复制以下模板并填入真实的密钥：

```env
# ======================================
# 存储配置 - 腾讯云COS
# ======================================
STORAGE_PROVIDER=tencent-cos
TENCENT_COS_SECRET_ID=your_tencent_cos_secret_id_here
TENCENT_COS_SECRET_KEY=your_tencent_cos_secret_key_here
TENCENT_COS_BUCKET=behindmemory-cn-1303112437
TENCENT_COS_REGION=ap-beijing
TENCENT_COS_DOMAIN=https://behindmemory-cn-1303112437.cos.ap-beijing.myqcloud.com

# ======================================
# 数据库配置 - Neon PostgreSQL
# ======================================
DATABASE_URL="your_postgres_database_url_here"
POSTGRES_URL="your_postgres_url_here"
POSTGRES_PRISMA_URL="your_postgres_prisma_url_here"
POSTGRES_URL_NO_SSL="your_postgres_url_no_ssl_here"
POSTGRES_URL_NON_POOLING="your_postgres_url_non_pooling_here"
POSTGRES_USER="your_postgres_user_here"
POSTGRES_HOST="your_postgres_host_here"
POSTGRES_PASSWORD="your_postgres_password_here"
POSTGRES_DATABASE="your_postgres_database_here"

# ======================================
# 认证配置 - NextAuth
# ======================================
NEXTAUTH_URL="https://behindmemory.cn"
NEXTAUTH_SECRET="your_nextauth_secret_here"

# Google OAuth（中国站不使用，但需要提供）
GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"

# ======================================
# 邮件配置 - Gmail SMTP
# ======================================
EMAIL_FROM="your_email@example.com"
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PASSWORD="your_gmail_app_password_here"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your_email@example.com"

# ======================================
# AI服务配置
# ======================================
MINIMAX_API_KEY="your_minimax_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"
REPLICATE_API_TOKEN="your_replicate_token_here"

# ======================================
# Redis/KV配置 - Upstash
# ======================================
KV_REST_API_READ_ONLY_TOKEN="your_kv_readonly_token_here"
KV_REST_API_TOKEN="your_kv_api_token_here"
KV_REST_API_URL="your_kv_api_url_here"
KV_URL="your_kv_url_here"

# ======================================
# 支付配置 - Paddle（可选）
# ======================================
PADDLE_SANDBOX=false
PADDLE_API_KEY="your_paddle_api_key_here"
PADDLE_API_URL="https://api.paddle.com"
PADDLE_WEBHOOK_SECRET="your_paddle_webhook_secret_here"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN="your_paddle_client_token_here"
NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID="your_price_id_here"
NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID="your_price_id_here"
NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID="your_price_id_here"
NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID="your_price_id_here"
NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID="your_price_id_here"

# ======================================
# 其他API配置
# ======================================
NEXT_PUBLIC_APP_URL="https://behindmemory.cn"
NEXT_PUBLIC_GOOGLE_MAPS_KEY="your_google_maps_key_here"
GOOGLE_TRANSLATE_API_KEY="your_google_translate_key_here"

# ======================================
# Node环境配置
# ======================================
NODE_ENV="production"

# ======================================
# 管理员配置
# ======================================
ADMIN_API_SECRET="your_admin_secret_here"
```

### 3. 生成NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 4. 设置文件权限

```bash
chmod 600 .env.production
```

---

## 域名与SSL配置

### 1. DNS配置

在域名管理平台添加A记录：

```
类型: A
主机记录: @
记录值: your_server_ip
TTL: 600
```

如果需要www子域名：

```
类型: A
主机记录: www
记录值: your_server_ip
TTL: 600
```

### 2. 配置Nginx反向代理

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/behindmemory
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name behindmemory.cn www.behindmemory.cn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/behindmemory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 申请SSL证书

```bash
sudo certbot --nginx -d behindmemory.cn -d www.behindmemory.cn
```

按照提示输入邮箱并同意条款。证书会自动配置到Nginx。

### 4. 验证SSL

访问 https://behindmemory.cn 验证HTTPS是否正常工作。

---

## 构建和启动应用

### 1. 修改docker-compose.yml端口配置

确保端口映射为 `3000:3000`：

```bash
nano docker-compose.yml
```

找到端口配置并修改为：

```yaml
ports:
  - "3000:3000"
```

### 2. 构建并启动Docker容器

```bash
# 构建镜像（首次部署需要较长时间）
sudo docker compose build

# 启动容器
sudo docker compose up -d

# 查看日志
sudo docker logs behindmemory-app

# 查看容器状态
sudo docker ps
```

### 3. 验证部署

```bash
# 本地测试
curl http://localhost:3000

# 检查API
curl http://localhost:3000/api/geo

# 通过域名访问
curl https://behindmemory.cn
```

---

## 更新部署

### 更新代码

```bash
# 方式1: 从GitHub拉取
cd ~/behindmemory
git pull origin main

# 方式2: 从本地上传新的tar包
# （在本地）
tar --exclude='.git' --exclude='node_modules' --exclude='.next' -czf behindmemo.tar.gz .
scp -i /path/to/your_key.pem behindmemo.tar.gz ubuntu@your_server_ip:~/

# （在服务器）
cd ~
mv behindmemory behindmemory.backup-$(date +%Y%m%d-%H%M%S)
mkdir behindmemory
tar -xzf behindmemo.tar.gz -C behindmemory
cd behindmemory
```

### 重新部署

```bash
# 停止容器
sudo docker compose down

# 重新构建并启动
sudo docker compose up -d --build

# 查看日志确认启动成功
sudo docker logs -f behindmemory-app
```

---

## 常见问题

### 1. 端口已被占用

**错误**：`bind: address already in use`

**解决**：
```bash
# 检查占用端口的进程
sudo netstat -tulnp | grep :80
sudo netstat -tulnp | grep :3000

# 修改docker-compose.yml中的端口映射为 3000:3000
```

### 2. Docker构建失败

**错误**：`npm install` 失败

**解决**：
```bash
# 清理Docker缓存
sudo docker system prune -a

# 重新构建
sudo docker compose build --no-cache
```

### 3. SSL证书申请失败

**错误**：`Failed to verify the temporary nginx configuration`

**解决**：
- 确保DNS已生效：`nslookup behindmemory.cn`
- 检查防火墙：`sudo ufw status`
- 确保80端口可访问：`curl http://behindmemory.cn`

### 4. 登录后跳转到localhost

**原因**：`.env.production` 中 `NEXTAUTH_URL` 配置错误

**解决**：
```bash
# 编辑环境变量
nano .env.production

# 确保设置为正确域名
NEXTAUTH_URL="https://behindmemory.cn"
NEXT_PUBLIC_APP_URL="https://behindmemory.cn"

# 重启容器
sudo docker compose restart
```

### 5. 图片上传失败

**原因**：腾讯云COS配置错误

**解决**：
- 检查SecretId和SecretKey是否正确
- 验证存储桶名称和区域
- 确保存储桶权限为"公有读私有写"
- 检查CORS配置

### 6. 网站无法访问

**排查步骤**：

```bash
# 1. 检查容器是否运行
sudo docker ps

# 2. 检查容器日志
sudo docker logs behindmemory-app

# 3. 检查Nginx状态
sudo systemctl status nginx

# 4. 检查Nginx日志
sudo tail -f /var/log/nginx/error.log

# 5. 测试本地访问
curl http://localhost:3000

# 6. 检查防火墙
sudo ufw status
```

---

## 维护命令

### 容器管理

```bash
# 查看容器日志
sudo docker logs -f behindmemory-app

# 查看容器状态
sudo docker ps

# 重启容器
sudo docker compose restart

# 停止容器
sudo docker compose down

# 启动容器
sudo docker compose up -d

# 进入容器Shell
sudo docker exec -it behindmemory-app sh
```

### Nginx管理

```bash
# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 查看Nginx状态
sudo systemctl status nginx

# 查看访问日志
sudo tail -f /var/log/nginx/access.log

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### SSL证书管理

```bash
# 查看证书信息
sudo certbot certificates

# 手动续期
sudo certbot renew

# 测试自动续期
sudo certbot renew --dry-run
```

### 系统监控

```bash
# 查看系统资源使用
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看Docker占用空间
sudo docker system df

# 清理Docker未使用资源
sudo docker system prune -a
```

---

## 安全建议

1. **定期更新系统**：
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **配置防火墙**：
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

3. **定期备份**：
   - 数据库定期导出
   - `.env.production` 文件备份
   - 重要文件定期备份

4. **监控日志**：
   - 定期检查Nginx日志
   - 监控Docker容器日志
   - 设置告警通知

5. **限制SSH��问**：
   - 使用SSH密钥认证
   - 禁用密码登录
   - 考虑使用非标准SSH端口

---

## 技术支持

如有问题，请参考：

- **项目文档**：`/docs` 目录
- **GitHub Issues**：https://github.com/messsiii/behindmemo/issues
- **腾讯云文档**：https://cloud.tencent.com/document/product
- **Docker文档**：https://docs.docker.com

---

**部署完成！** 🎉

你的Behind Memory中国版应该已经在 https://behindmemory.cn 上线运行了。
