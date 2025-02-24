const withNextIntl = require("next-intl/plugin")("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
  typescript: {
    // !! WARN !!
    // 在生产构建时禁用类型检查
    // 确保在开发和CI环境中运行类型检查
    ignoreBuildErrors: true,
  },
  eslint: {
    // 在生产构建时禁用 ESLint
    // 确保在开发和CI环境中运行 ESLint
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

module.exports = withNextIntl(nextConfig);
