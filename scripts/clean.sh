#!/bin/bash

# 删除构建和缓存文件
rm -rf .next
rm -rf dist
rm -rf node_modules
rm -rf .turbo
rm -rf .cache

# 删除包管理器的锁文件
rm -f package-lock.json
rm -f yarn.lock
rm -f pnpm-lock.yaml

# 删除环境文件（保留示例文件）
find . -maxdepth 1 -type f -name ".env*" ! -name ".env.example" -exec rm {} +

# 删除数据库文件
rm -f prisma/dev.db
rm -f prisma/dev.db-journal

echo "✨ 清理完成"
