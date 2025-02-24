# 构建阶段
FROM node:18-alpine AS deps

# 安装系统依赖和 pnpm
RUN apk add --no-cache openssl openssl-dev libc6-compat && \
    corepack enable && corepack prepare pnpm@8.15.1 --activate

WORKDIR /app

# 复制依赖相关文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 优化依赖安装
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --lockfile-only=false --prod && \
    pnpm install --lockfile-only=false

# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN apk add --no-cache openssl openssl-dev libc6-compat && \
    corepack enable && corepack prepare pnpm@8.15.1 --activate

# 复制依赖和源代码
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置环境变量并构建
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN pnpm prisma generate && \
    pnpm build

# 生产阶段
FROM node:18-alpine AS runner

# 安装必要的系统依赖
RUN apk add --no-cache \
    openssl \
    openssl-dev \
    libc6-compat \
    curl \
    netcat-openbsd \
    postgresql-client \
    tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    apk del tzdata && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PATH=/app/node_modules/.bin:$PATH \
    TZ=Asia/Shanghai

# 复制构建文件和依赖
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh

# 设置权限并生成 Prisma 客户端
RUN chmod +x /docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app && \
    corepack enable && \
    corepack prepare pnpm@8.15.1 --activate && \
    cd /app && \
    npx prisma generate

# 切换用户
USER nextjs

# 配置容器
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/healthcheck || exit 1

# 启动应用
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
