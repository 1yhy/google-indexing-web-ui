import Sitemapper from "sitemapper";
import { fetchRetry } from "./utils";
import { webmasters_v3 } from "googleapis";
import { t } from "@/i18n";

/**
 * Retrieves a list of sitemaps associated with the specified site URL from the Google Webmasters API.
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
    console.error(`🔐 ${t("logs.errors.sitemapAccessDenied")}`);
    return [];
  }

  if (response.status >= 300) {
    console.error(`❌ ${t("logs.errors.sitemapListFailed")}`);
    console.error(`📡 响应状态码: ${response.status}`);
    console.error(`📡 响应内容: ${await response.text()}`);
    return [];
  }

  const body: webmasters_v3.Schema$SitemapsListResponse = await response.json();

  if (!body.sitemap) {
    console.error(`❌ ${t("logs.errors.noSitemapsFound")}`);
    return [];
  }

  return body.sitemap.filter((x) => x.path !== undefined && x.path !== null).map((x) => x.path as string);
}

/**
 * Fetches all page URLs from a single sitemap URL.
 */
async function fetchUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const Google = new Sitemapper({
      url: sitemapUrl,
    });

    const { sites } = await Google.fetch();
    return sites;
  } catch (error) {
    console.error(`❌ ${t("logs.errors.fetchSitemapUrlsFailed")}: ${error instanceof Error ? error.message : t("logs.errors.unknown")}`);
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
  sitemapUrl?: string
): Promise<[string[], string[]]> {
  // If a specific sitemap URL is provided, fetch URLs directly from it
  if (sitemapUrl) {
    console.log(`🔍 正在从 Sitemap 获取 URLs: ${sitemapUrl}`);
    const urls = await fetchUrlsFromSitemap(sitemapUrl);
    return [[], [...new Set(urls)]];
  }

  // Otherwise get all sitemaps from Google Search Console
  if (!accessToken || !siteUrl) {
    throw new Error(`❌ ${t("logs.errors.sitemapListParamsRequired")}`);
  }

  console.log(`🔍 正在获取站点 Sitemap 列表: ${siteUrl}`);
  const sitemaps = await getSitemapsList(accessToken, siteUrl);
  let pages: string[] = [];

  for (const url of sitemaps) {
    console.log(`📄 正在处理 Sitemap: ${url}`);
    const urls = await fetchUrlsFromSitemap(url);
    pages = [...pages, ...urls];
  }

  console.log(`✅ 已获取所有 URLs，总计: ${pages.length}`);
  return [sitemaps, [...new Set(pages)]];
}
