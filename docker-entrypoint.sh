#!/bin/sh
set -e

# 错误处理函数
handle_error() {
    echo "❌ 错误：$1"
    exit 1
}

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1"
}

# 从 DATABASE_URL 中提取连接信息
parse_db_url() {
    if [ -z "$DATABASE_URL" ]; then
        DB_HOST="postgres"
        DB_PORT="5432"
        DB_USER="${POSTGRES_USER:-username}"
        DB_NAME="${POSTGRES_DB:-google_indexing}"
    else
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    fi

    if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
        handle_error "无法解析数据库连接信息"
    fi
}

# 等待数据库连接
wait_for_db() {
    local max_attempts=30
    local attempt=1

    log "🔄 正在检查数据库连接 ${DB_HOST}:${DB_PORT}..."

    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
            log "✅ 数据库连接成功！"
            return 0
        fi

        log "⏳ 等待数据库就绪... (尝试 $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    handle_error "数据库连接超时"
}

# 执行数据库迁移
run_migrations() {
    if [ "${SKIP_MIGRATIONS}" = "true" ]; then
        log "⏭️ 跳过数据库迁移（SKIP_MIGRATIONS=true）"
        return 0
    fi

    log "🔄 正在执行数据库迁移..."
    if [ -f "./prisma/schema.prisma" ]; then
        log "🔄 检测到架构变更，正在应用迁移..."

        # 首先尝试创建初始迁移
        if [ ! -d "./prisma/migrations" ] || [ -z "$(ls -A ./prisma/migrations)" ]; then
            log "📦 创建初始迁移..."
            prisma migrate dev --name init --create-only || true
        fi

        # 应用所有迁移
        if ! prisma migrate deploy; then
            log "❌ 数据库迁移失败"
            if [ "${ALLOW_SKIP_MIGRATIONS}" != "true" ]; then
                handle_error "数据库迁移失败且 ALLOW_SKIP_MIGRATIONS=false"
            fi
            log "⚠️ 继续执行（ALLOW_SKIP_MIGRATIONS=true）"
        fi

        # 推送架构更改（以防迁移失败）
        log "🔄 确保数据库架构同步..."
        prisma db push --accept-data-loss
    fi
}

# 生成 Prisma 客户端
generate_prisma_client() {
    log "🔄 正在生成 Prisma 客户端..."
    if ! prisma generate; then
        handle_error "Prisma 客户端生成失败"
    fi
}

# 主流程
main() {
    parse_db_url
    wait_for_db
    run_migrations
    generate_prisma_client
}

# 执行主流程
if ! main; then
    exit 1
fi

# 启动应用
log "🚀 正在启动应用..."
exec "$@"
