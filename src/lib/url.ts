import { prisma } from "./prisma";

/**
 * 将 URL 转换为文件路径格式
 */
export function convertToFilePath(url: string): string {
  return url.replace("http://", "http_").replace("https://", "https_").replaceAll("/", "_");
}

/**
 * 将域名转换为 HTTP URL
 */
export function convertToHTTP(domain: string): string {
  return `http://${domain}/`;
}

/**
 * 将域名转换为 HTTPS URL
 */
export function convertToHTTPS(domain: string): string {
  return `https://${domain}/`;
}

/**
 * 将域名转换为 sc-domain 格式
 */
export function convertToSCDomain(httpUrl: string): string {
  return `sc-domain:${httpUrl.replace("http://", "").replace("https://", "").replace("/", "")}`;
}

export async function getFromCache(appId: string, url: string) {
  console.log(`🔍 从缓存中查找: ${url}`);
  const cache = await prisma.urlCache.findUnique({
    where: {
      url_appId: {
        url,
        appId,
      },
    },
  });

  if (!cache) {
    console.log(`❌ 未找到缓存: ${url}`);
    return null;
  }

  // 检查缓存是否过期
  const isExpired = cache.lastCheckedAt < new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  console.log(`📦 缓存状态:`, {
    url: cache.url,
    status: cache.status,
    lastCheckedAt: cache.lastCheckedAt,
    isExpired,
  });

  return isExpired ? null : cache;
}

export async function updateCache(appId: string, url: string, status: string) {
  console.log(`💾 更新缓存:`, {
    url,
    status,
    appId,
  });

  return prisma.urlCache.upsert({
    where: {
      url_appId: {
        url,
        appId,
      },
    },
    create: {
      url,
      status,
      lastCheckedAt: new Date(),
      appId,
    },
    update: {
      status,
      lastCheckedAt: new Date(),
    },
  });
}
