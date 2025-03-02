import { prisma } from "./prisma";

/**
 * convertonverto file path formatfile path format
 */
export function convertToFilePath(url: string): string {
  return url.replace("http://", "http_").replace("https://", "https_").replaceAll("/", "_");
}

/**
 * convert domain to HTTP URL
 */
export function convertToHTTP(domain: string): string {
  return `http://${domain}/`;
}

/**
 * convert domain to HTTPS URL
 */
export function convertToHTTPS(domain: string): string {
  return `https://${domain}/`;
}

/**
 * convert domain to sc-domain format
 */
export function convertToSCDomain(httpUrl: string): string {
  return `sc-domain:${httpUrl.replace("http://", "").replace("https://", "").replace("/", "")}`;
}

export async function getFromCache(appId: string, url: string) {
  console.log(`🔍 Get from cache: ${url}`);
  const cache = await prisma.urlCache.findUnique({
    where: {
      url_appId: {
        url,
        appId,
      },
    },
  });

  if (!cache) {
    console.log(`❌ Not found in cache: ${url}`);
    return null;
  }

  // 检查缓存是否过期
  const isExpired = cache.lastCheckedAt < new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  console.log(`📦 Cache status:`, {
    url: cache.url,
    status: cache.status,
    lastCheckedAt: cache.lastCheckedAt,
    isExpired,
  });

  return isExpired ? null : cache;
}

export async function updateCache(appId: string, url: string, status: string) {
  console.log(`💾 Update cache:`, {
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
