# =========================================
# Behind Memory - Docker Multi-Stage Build
# 支持国际版和中国版部署
# =========================================

# ------ 阶段1：基础镜像 ------
FROM node:18-alpine AS base

# 安装依赖包（Prisma需要）
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ------ 阶段2：安装依赖 ------
FROM base AS deps

# 复制依赖清单
COPY package.json package-lock.json* ./

# 安装依赖（使用legacy-peer-deps绕过依赖冲突）
RUN npm ci --legacy-peer-deps

# ------ 阶段3：构建应用 ------
FROM base AS builder

WORKDIR /app

# 从deps阶段复制依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制所有源代码
COPY . .

# 关闭Next.js遥测
ENV NEXT_TELEMETRY_DISABLED=1

# 生成Prisma Client
RUN npx prisma generate

# 构建Next.js应用（生成standalone输出）
RUN npm run build

# ------ 阶段4：运行环境 ------
FROM base AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# 复制standalone文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置默认端口
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/version', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "server.js"]
