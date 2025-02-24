# Google Indexing Web UI

<p align="center">
  <img src="https://yhyblog-2023-2-8.oss-cn-hangzhou.aliyuncs.com/2025/2025-02-25/20250225012816.png" alt="Google Indexing Web UI">
</p>

<p align="center">
  <a href="https://nodejs.org/en/about/releases/">
    <img alt="Node.js" src="https://img.shields.io/badge/Node.js-v18-339933?logo=node.js&logoColor=white"></a>
  <a href="https://pnpm.io/">
    <img alt="PNPM" src="https://img.shields.io/badge/PNPM-v8-F69220?logo=pnpm&logoColor=white"></a>
  <a href="https://www.postgresql.org/">
    <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-v14-4169E1?logo=postgresql&logoColor=white"></a>
  <a href="https://nextjs.org/">
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white"></a>
  <a href="https://www.typescriptlang.org/">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://tailwindcss.com/">
    <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="#功能特点">功能特点</a> ·
  <a href="#系统要求">系统要求</a> ·
  <a href="#快速部署">快速部署</a> ·
  <a href="#开发指南">开发指南</a>
</p>

## 🌐 运行demo

运行demo，无需自行部署：

- 访问地址：[https://indexing.yhy.gd.cn/indexing](https://indexing.yhy.gd.cn/indexing

## 📖 简介

根据 [google-indexing-script](https://github.com/goenning/google-indexing-script) 项目开发的 Web UI 索引界面，通过 Google API 和可视化的界面对站点页面进行批量提交请求索引功能，提高页面的索引效率。

## ✨ 功能特点

- 📈 详细的索引统计和分析
- 🔍 批量索引管理
- 🎯 多站点管理支持
- 🌐 国际化支持（中文和英文）
- 🔐 Google OAuth 认证
- 📱 响应式设计
- 🗄️ PostgreSQL 数据库集成

## 🛠️ 系统要求

- Node.js v18 或更高版本
- PNPM v8 或更高版本
- PostgreSQL v14 或更高版本
- [Google Search Console](https://search.google.com/search-console/about) 账号

## 💻 开发环境设置

### 1. 基础环境要求

- Node.js v18 或更高版本
- PNPM v8 或更高版本
- PostgreSQL v14 或更高版本
- [Google Search Console](https://search.google.com/search-console/about) 账号

### 2. 安装 PostgreSQL 数据库（必需）

选择以下任一方式安装：

#### Windows 用户
1. 访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/) 下载安装包
2. 运行安装程序，记住设置的超级用户密码
3. 安装完成后，打开 SQL Shell (psql) 或 pgAdmin 4

#### macOS 用户
方式一：使用 Homebrew（推荐）
```bash
# 安装 PostgreSQL
brew install postgresql@14

# 启动 PostgreSQL 服务
brew services start postgresql@14
```

方式二：使用 [Postgres.app](https://postgresapp.com/)（图形界面）
1. 下载并安装 Postgres.app
2. 将应用拖到应用程序文件夹
3. 双击启动，自动完成初始化

### 3. 克隆项目
```bash
git clone https://github.com/1yhy/google-indexing-web-ui.git
cd google-indexing-web-ui
```

### 4. 安装项目依赖
```bash
# 安装项目依赖
pnpm install
```

### 5. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env
```

编辑 `.env` 文件，设置以下必需的环境变量：
```bash
# 数据库连接（本地开发必需）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/google_indexing

# Google OAuth 配置（必需）
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth 配置（必需）
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=你的密钥  # 可用 openssl rand -base64 32 生成
```

### 6. 初始化数据库

```bash
# 创建数据库（如果使用默认 postgres 用户）
createdb google_indexing

# 或者使用 psql 创建
psql -U postgres
postgres=# CREATE DATABASE google_indexing;
postgres=# \q

# 初始化数据库表结构（在项目目录下执行）
pnpm db:push
```

### 7. 启动开发服务器
```bash
pnpm dev
```

现在你可以访问 http://localhost:3000 查看应用了。

### 常见问题解决

1. 数据库连接失败：
   - 确认 PostgreSQL 服务是否正在运行
   - 验证数据库连接：
     ```bash
     psql -U postgres -d google_indexing
     ```
   - 检查 DATABASE_URL 中的用户名和密码是否正确

2. 权限问题：
   ```bash
   # 确保数据库用户有足够权限
   psql -U postgres
   postgres=# ALTER USER postgres WITH SUPERUSER;
   ```

3. 端口占用：
   - 默认端口 3000 被占用时，可在 `.env` 中修改：
     ```bash
     PORT=3001
     ```

## 🚀 快速部署

<details>
<summary>点击展开完整部署步骤</summary>

1. 创建部署目录：
```bash
mkdir google-indexing-web-ui && cd google-indexing-web-ui
```

2. 创建必要的配置文件：

创建 `docker-compose.yml`：
```yaml
version: '3.8'

services:
  app:
    image: yhy20010203360/google-indexing-web-ui:${TAG:-latest}
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL=${DATABASE_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - SKIP_MIGRATIONS=${SKIP_MIGRATIONS:-false}
      - ALLOW_SKIP_MIGRATIONS=${ALLOW_SKIP_MIGRATIONS:-false}
      - REGENERATE_CLIENT=${REGENERATE_CLIENT:-false}
      - TZ=${TZ:-Asia/Shanghai}
    networks:
      - app_network
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  postgres:
    image: postgres:16-alpine
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-username}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
      - POSTGRES_DB=${POSTGRES_DB:-google_indexing}
      - TZ=${TZ:-Asia/Shanghai}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
    networks:
      - app_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-username} -d ${POSTGRES_DB:-google_indexing}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

networks:
  app_network:
    driver: bridge

volumes:
  postgres_data:
    name: ${COMPOSE_PROJECT_NAME:-google_indexing}_postgres_data
```

创建 `.env` 文件：
```bash
# 必需配置
NODE_ENV=production
TZ=Asia/Shanghai

# Google OAuth 配置（必需）
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth 配置（必需）
NEXTAUTH_URL=https://your-domain.com       # 改为你的实际域名（生产环境必须是 HTTPS）
NEXTAUTH_SECRET=your-secret-key            # 可用 openssl rand -base64 32 生成

# 数据库配置（必需）
POSTGRES_USER=username         # 数据库用户名
POSTGRES_PASSWORD=password  # 数据库密码
POSTGRES_DB=google_indexing # 数据库名称

# 数据库连接 URL（必需，选择一个配置）
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}  # Docker 环境使用
# DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}  # 本地开发使用
# DATABASE_URL=postgresql://user:password@your-database-host:5432/dbname  # 外部数据库使用

# 端口配置
PORT=3000                    # 应用端口，默认 3000
DB_PORT=5432                # 数据库端口，默认 5432

# 数据库迁移控制
SKIP_MIGRATIONS=false       # 设置为 true 可跳过数据库迁移
ALLOW_SKIP_MIGRATIONS=false # 设置为 true 允许迁移失败时继续运行
REGENERATE_CLIENT=false     # 设置为 true 强制重新生成 Prisma 客户端

# Docker 配置
COMPOSE_PROJECT_NAME=google_indexing  # Docker 卷标识，避免多项目冲突
```

3. 启动服务：
```bash
docker compose up -d
```

</details>

服务将在 3000 端口启动，你可以通过反向代理将域名指向这个端口。

## 🛠️ 常用命令

- 查看服务状态：`docker compose ps`
- 查看日志：`docker compose logs -f`
- 重启服务：`docker compose restart`
- 停止服务：`docker compose down`
- 更新服务：
  ```bash
  docker compose pull  # 拉取最新镜像
  docker compose up -d  # 重新启动服务
  ```

## 🔐 Google OAuth 配置

<details>
<summary>点击展开 OAuth 配置步骤</summary>

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 API：
   - 进入 "API 和服务" -> "库"
   - 搜索并启用 "Google Search Console API"
   - 搜索并启用 "Indexing API"

4. 配置 OAuth 凭据：
   - 进入 "API 和服务" -> "凭据"
   - 点击 "创建凭据" -> "OAuth 客户端 ID"
   - 选择 "Web 应用"
   - 填写应用名称
   - 添加授权的 JavaScript 来源：
     ```
     http://localhost:3000  // 开发环境
     https://你的域名      // 生产环境
     ```
   - 添加授权的重定向 URI：
     ```
     http://localhost:3000/api/auth/callback/google  // 开发环境
     https://你的域名/api/auth/callback/google      // 生产环境
     ```
   - 创建后会得到 Client ID 和 Client Secret
   - 将 Client ID 和 Client Secret 填入 `.env` 文件

</details>

## 👨‍💻 开发指南

如果你想参与开发，请查看 [CONTRIBUTING.md](CONTRIBUTING.md)。

### 本地开发环境要求

- Node.js v18 或更高版本
- PNPM v8 或更高版本
- PostgreSQL v14 或更高版本

### 开发步骤

1. 克隆仓库：
```bash
git clone https://github.com/1yhy/google-indexing-web-ui.git
cd google-indexing-web-ui
```

2. 安装依赖：
```bash
pnpm install
```

3. 配置环境变量：
```bash
cp .env.example .env
```

4. 启动开发服务器：
```bash
pnpm dev
```

### 自动构建和发布

本项目使用 GitHub Actions 进行自动化构建和发布。每当代码推送到主分支或创建新的标签时，都会自动触发构建流程：

- 推送到主分支：构建并发布 `latest` 标签的镜像
- 创建新标签（`v*.*.*`）：构建并发布对应版本的镜像
- 所有镜像会自动发布到 [Docker Hub](https://hub.docker.com/r/yhy20010203360/google-indexing-web-ui)

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [google-indexing-script](https://github.com/goenning/google-indexing-script) - 核心索引功能
- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件
