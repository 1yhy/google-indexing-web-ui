# Google Indexing Web UI

<p align="center">
  <img src="https://yhyblog-2023-2-8.oss-cn-hangzhou.aliyuncs.com/2025/2025-02-25/20250225012816.png" alt="Google Indexing Web UI">
</p>

<p align="center">
  <a href="https://github.com/1yhy/google-indexing-web-ui/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/1yhy/google-indexing-web-ui?color=blue"></a>
  <a href="https://github.com/1yhy/google-indexing-web-ui/releases">
    <img alt="Release" src="https://img.shields.io/github/v/release/1yhy/google-indexing-web-ui?color=blue"></a>
  <a href="https://hub.docker.com/r/yhy20010203360/google-indexing-web-ui">
    <img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/yhy20010203360/google-indexing-web-ui?color=blue"></a>
  <a href="https://github.com/1yhy/google-indexing-web-ui/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/1yhy/google-indexing-web-ui?style=flat"></a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#requirements">Requirements</a> ·
  <a href="#quick-deployment">Quick Deployment</a> ·
  <a href="#development-guide">Development Guide</a>
</p>

## 🌐 Live Demo

Try our live demo without deployment:

- Access URL: [https://indexing.yhy.gd.cn/indexing](https://indexing.yhy.gd.cn/indexing)

## 📖 Introduction

A web UI interface developed based on the [google-indexing-script](https://github.com/goenning/google-indexing-script) project, providing a visual interface to batch submit page indexing requests through Google API, improving page indexing efficiency.

## ✨ Features

- 📈 Detailed indexing statistics and analysis
- 🔍 Batch indexing management
- 🎯 Multi-site management support
- 🌐 Internationalization (English & Chinese)
- 🔐 Google OAuth authentication
- 📱 Responsive design
- 🗄️ PostgreSQL database integration

## 🛠️ Requirements

- Node.js v18 or higher
- PNPM v8 or higher
- PostgreSQL v14 or higher
- [Google Search Console](https://search.google.com/search-console/about) account

### PostgreSQL Database Installation Guide

#### Windows Installation
1. Download and Install:
   - Visit [PostgreSQL Website](https://www.postgresql.org/download/windows/)
   - Download PostgreSQL installer
   - Run installer and follow the prompts

2. Command Line Tools:
```bash
# Connect to database
psql -U postgres

# Create database
CREATE DATABASE google_indexing;

# Create user
CREATE USER username WITH PASSWORD 'password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE google_indexing TO username;
```

#### macOS Installation
1. Using Homebrew:
```bash
# Install PostgreSQL
brew install postgresql@14

# Start service
brew services start postgresql@14

# Create database
createdb google_indexing

# Connect to database
psql google_indexing

# Create user and grant privileges
CREATE USER username WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE google_indexing TO username;
```

2. Or using Postgres.app:
   - Download [Postgres.app](https://postgresapp.com/)
   - Drag to Applications folder
   - Double click to start and follow initialization prompts

#### Verify Installation
```bash
# Test connection
psql -U username -d google_indexing -h localhost

# Check version
psql --version
```

## 💻 Development Environment Setup

### 1. Basic Requirements

- Node.js v18 or higher
- PNPM v8 or higher
- PostgreSQL v14 or higher
- [Google Search Console](https://search.google.com/search-console/about) account

### 2. Install PostgreSQL (Required)

Choose one of the following installation methods:

#### Windows Users
1. Visit [PostgreSQL Website](https://www.postgresql.org/download/windows/) to download the installer
2. Run the installer and remember the superuser password
3. After installation, open SQL Shell (psql) or pgAdmin 4

#### macOS Users
Option 1: Using Homebrew (Recommended)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14
```

Option 2: Using [Postgres.app](https://postgresapp.com/) (GUI)
1. Download and install Postgres.app
2. Drag to Applications folder
3. Double click to start, initialization will complete automatically

### 3. Clone Project
```bash
git clone https://github.com/1yhy/google-indexing-web-ui.git
cd google-indexing-web-ui
```

### 4. Install Dependencies
```bash
# Install project dependencies
pnpm install
```

### 5. Configure Environment Variables
```bash
# Copy environment template
cp .env.example .env
```

Edit the `.env` file and set the following required variables:
```bash
# Database connection (Required for local development)
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/google_indexing

# Google OAuth Configuration (Required)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth Configuration (Required)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key  # Generate using: openssl rand -base64 32
```

### 6. Initialize Database

```bash
# Create database (if using default postgres user)
createdb google_indexing

# Or using psql
psql -U postgres
postgres=# CREATE DATABASE google_indexing;
postgres=# \q

# Initialize database tables (run in project directory)
pnpm db:push
```

### 7. Start Development Server
```bash
pnpm dev
```

You can now access the application at http://localhost:3000.

### Troubleshooting

1. Database Connection Issues:
   - Verify PostgreSQL service is running
   - Test database connection:
     ```bash
     psql -U postgres -d google_indexing
     ```
   - Check if DATABASE_URL username and password are correct

2. Permission Issues:
   ```bash
   # Ensure database user has sufficient privileges
   psql -U postgres
   postgres=# ALTER USER postgres WITH SUPERUSER;
   ```

3. Port in Use:
   - If default port 3000 is occupied, modify in `.env`:
     ```bash
     PORT=3001
     ```

## 🚀 Quick Deployment

<details>
<summary>Click to expand full deployment steps</summary>

1. Create deployment directory:
```bash
mkdir google-indexing-web-ui && cd google-indexing-web-ui
```

2. Create necessary configuration files:

Create `docker-compose.yml`:
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

Create `.env` file:
```bash
# Required Configuration
NODE_ENV=production
TZ=Asia/Shanghai

# Google OAuth Configuration (Required)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth Configuration (Required)
NEXTAUTH_URL=https://your-domain.com       # Change to your actual domain (HTTPS required for production)
NEXTAUTH_SECRET=your-secret-key            # Generate using: openssl rand -base64 32

# Database Configuration (Required)
POSTGRES_USER=username         # Database username
POSTGRES_PASSWORD=password  # Database password
POSTGRES_DB=google_indexing # Database name

# Database Connection URL (Required, choose one)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}  # For Docker
# DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}  # For local development
# DATABASE_URL=postgresql://user:password@your-database-host:5432/dbname  # For external database

# Port Configuration
PORT=3000                    # Application port, default 3000
DB_PORT=5432                # Database port, default 5432

# Database Migration Control
SKIP_MIGRATIONS=false       # Set to true to skip database migrations
ALLOW_SKIP_MIGRATIONS=false # Set to true to continue if migrations fail
REGENERATE_CLIENT=false     # Set to true to force Prisma client regeneration

# Docker Configuration
COMPOSE_PROJECT_NAME=google_indexing  # Docker volume identifier to avoid conflicts
```

3. Start services:
```bash
docker compose up -d
```

</details>

The service will start on port 3000. You can point your domain to this port through a reverse proxy.

## 🛠️ Common Commands

- Check service status: `docker compose ps`
- View logs: `docker compose logs -f`
- Restart services: `docker compose restart`
- Stop services: `docker compose down`
- Update services:
  ```bash
  docker compose pull  # Pull latest images
  docker compose up -d  # Restart services
  ```

## 🔐 Google OAuth Configuration

<details>
<summary>Click to expand OAuth configuration steps</summary>

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing one
3. Enable APIs:
   - Go to "APIs & Services" -> "Library"
   - Search and enable "Google Search Console API"
   - Search and enable "Indexing API"

4. Configure OAuth credentials:
   - Go to "APIs & Services" -> "Credentials"
   - Click "Create Credentials" -> "OAuth client ID"
   - Select "Web application"
   - Fill in application name
   - Add authorized JavaScript origins:
     ```
     http://localhost:3000  // Development
     https://your-domain    // Production
     ```
   - Add authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google  // Development
     https://your-domain/api/auth/callback/google    // Production
     ```
   - After creation, you'll get Client ID and Client Secret
   - Fill these into your `.env` file

</details>

## 👨‍💻 Development Guide

If you want to contribute to development, please check [CONTRIBUTING.md](CONTRIBUTING.md).

### Local Development Requirements

- Node.js v18 or higher
- PNPM v8 or higher
- PostgreSQL v14 or higher

### Development Steps

1. Clone repository:
```bash
git clone https://github.com/1yhy/google-indexing-web-ui.git
cd google-indexing-web-ui
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
pnpm dev
```

### Automated Build and Release

This project uses GitHub Actions for automated builds and releases. The build process is triggered automatically when:

- Push to main branch: Builds and publishes the `latest` tag image
- Create new tag (`v*.*.*`): Builds and publishes the corresponding version image
- All images are automatically published to [Docker Hub](https://hub.docker.com/r/yhy20010203360/google-indexing-web-ui)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [google-indexing-script](https://github.com/goenning/google-indexing-script) - Core indexing functionality
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
