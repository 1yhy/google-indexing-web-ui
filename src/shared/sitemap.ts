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
    console.error(`${t("logs.errors.sitemapAccessDenied")}`);
    return [];
  }

  if (response.status >= 300) {
    console.error(`${t("logs.errors.sitemapListFailed")}`);
    console.error(`📡 Response Code: ${response.status}`);
    console.error(`📡 Response Body: ${await response.text()}`);
    return [];
  }

  const body: webmasters_v3.Schema$SitemapsListResponse = await response.json();

  if (!body.sitemap) {
    console.error(`${t("logs.errors.noSitemapsFound")}`);
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
 * get all sitemap URLs of site or get page URLs from specified sitemap URL
 * @param accessToken access token (optional, not needed if sitemapUrl is provided)
 * @param siteUrl site URL (optional, not needed if sitemapUrl is provided)
 * @param sitemapUrl specified sitemap URL (optional)
 * @returns if siteUrl is provided, return [sitemaps, urls]; if sitemapUrl is provided, return [[], urls]
 */
export async function getSitemapPages(
  accessToken?: string,
  siteUrl?: string,
  sitemapUrl?: string
): Promise<[string[], string[]]> {
  // If a specific sitemap URL is provided, fetch URLs directly from it
  if (sitemapUrl) {
    console.log(`🔍 Getting URLs from Sitemap: ${sitemapUrl}`);
    const urls = await fetchUrlsFromSitemap(sitemapUrl);
    return [[], [...new Set(urls)]];
  }

  // Otherwise get all sitemaps from Google Search Console
  if (!accessToken || !siteUrl) {
    throw new Error(`${t("logs.errors.sitemapListParamsRequired")}`);
  }

  console.log(`🔍 Getting Sitemap list of site: ${siteUrl}`);
  const sitemaps = await getSitemapsList(accessToken, siteUrl);
  let pages: string[] = [];

  for (const url of sitemaps) {
    console.log(`📄 Processing Sitemap: ${url}`);
    const urls = await fetchUrlsFromSitemap(url);
    pages = [...pages, ...urls];
  }

  console.log(`✅ Got all URLs, total: ${pages.length}`);
  return [sitemaps, [...new Set(pages)]];
}
