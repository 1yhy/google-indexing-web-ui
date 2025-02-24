import Sitemapper from "sitemapper";
import { fetchRetry } from "./utils";
import { webmasters_v3 } from "googleapis";

/**
 * Retrieves a list of sitemaps associated with the specified site URL from the Google Webmasters API.
 * @param accessToken The access token for authentication.
 * @param siteUrl The URL of the site for which to retrieve the list of sitemaps.
 * @returns An array containing the paths of the sitemaps associated with the site URL.
 */
async function getSitemapsList(accessToken: string, siteUrl: string) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`;

  const response = await fetchRetry(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 403) {
    console.error(`🔐 This service account doesn't have access to this site.`);
    return [];
  }

  if (response.status >= 300) {
    console.error(`❌ Failed to get list of sitemaps.`);
    console.error(`Response was: ${response.status}`);
    console.error(await response.text());
    return [];
  }

  const body: webmasters_v3.Schema$SitemapsListResponse = await response.json();

  if (!body.sitemap) {
    console.error("❌ No sitemaps found, add them to Google Search Console and try again.");
    return [];
  }

  return body.sitemap.filter((x) => x.path !== undefined && x.path !== null).map((x) => x.path as string);
}

/**
 * 从单个 sitemap URL 获取所有页面 URLs
 */
async function fetchUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const Google = new Sitemapper({
      url: sitemapUrl,
    });

    const { sites } = await Google.fetch();
    return sites;
  } catch (error) {
    console.error(`❌ 从 sitemap 获取 URLs 失败: ${error instanceof Error ? error.message : "未知错误"}`);
    return [];
  }
}

/**
 * 获取站点的所有 sitemap URLs 或从指定的 sitemap URL 获取页面 URLs
 * @param accessToken 访问令牌（可选，如果提供 sitemapUrl 则不需要）
 * @param siteUrl 站点 URL（可选，如果提供 sitemapUrl 则不需要）
 * @param sitemapUrl 指定的 sitemap URL（可选）
 * @returns 如果提供 siteUrl，返回 [sitemaps, urls]；如果提供 sitemapUrl，返回 [[], urls]
 */
export async function getSitemapPages(
  accessToken?: string,
  siteUrl?: string,
  sitemapUrl?: string,
): Promise<[string[], string[]]> {
  // 如果提供了具体的 sitemap URL，直接获取其中的 URLs
  if (sitemapUrl) {
    const urls = await fetchUrlsFromSitemap(sitemapUrl);
    return [[], [...new Set(urls)]];
  }

  // 否则从 Google Search Console 获取所有 sitemaps
  if (!accessToken || !siteUrl) {
    throw new Error("获取 sitemap 列表需要提供 accessToken 和 siteUrl");
  }

  const sitemaps = await getSitemapsList(accessToken, siteUrl);
  let pages: string[] = [];

  for (const url of sitemaps) {
    const urls = await fetchUrlsFromSitemap(url);
    pages = [...pages, ...urls];
  }

  return [sitemaps, [...new Set(pages)]];
}
