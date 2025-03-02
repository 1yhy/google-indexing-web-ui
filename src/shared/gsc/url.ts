import { webmasters_v3 } from "googleapis";
import { fetchRetry } from "../utils";
import { convertToHTTP, convertToHTTPS, convertToSCDomain } from "@/lib/url";
import { t } from "@/i18n";

/**
 * Convert to Google Search Console site URL format
 */
export function convertToSiteUrl(input: string) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input.endsWith("/") ? input : `${input}/`;
  }
  return `sc-domain:${input}`;
}

/**
 * Get the list of sites associated with the service account
 */
export async function getSites(accessToken: string) {
  console.log("🔍 Getting site list...");
  const sitesResponse = await fetchRetry("https://www.googleapis.com/webmasters/v3/sites", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (sitesResponse.status === 403) {
    const error = `${t("logs.errors.noSiteAccess")}`;
    console.error(error);
    throw new Error(error);
  }

  const sitesBody: webmasters_v3.Schema$SitesListResponse = await sitesResponse.json();

  if (!sitesBody.siteEntry) {
    const error = `${t("logs.errors.noSitesFound")}`;
    console.error(error);
    throw new Error(error);
  }

  const sites = sitesBody.siteEntry.map((x) => x.siteUrl);
  console.log("📋 Found the following sites:", sites);
  return sites;
}

/**
 * Check if the site URL is accessible
 */
export async function checkSiteUrl(
  accessToken: string | undefined | null,
  siteUrl: string | undefined | null
): Promise<string> {
  if (!accessToken) throw new Error(`${t("logs.errors.accessTokenRequired")}`);
  if (!siteUrl) throw new Error(`${t("logs.errors.siteUrlRequired")}`);

  console.log(`🔍 Checking site access permission: ${siteUrl}`);
  const sites = await getSites(accessToken);
  const formattedUrls: string[] = [];

  // Convert site URL to all possible formats
  if (siteUrl.startsWith("https://")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTP(siteUrl.replace("https://", "")));
    formattedUrls.push(convertToSCDomain(siteUrl));
  } else if (siteUrl.startsWith("http://")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTPS(siteUrl.replace("http://", "")));
    formattedUrls.push(convertToSCDomain(siteUrl));
  } else if (siteUrl.startsWith("sc-domain:")) {
    formattedUrls.push(siteUrl);
    formattedUrls.push(convertToHTTP(siteUrl.replace("sc-domain:", "")));
    formattedUrls.push(convertToHTTPS(siteUrl.replace("sc-domain:", "")));
  } else {
    // Handle pure domain name case
    formattedUrls.push(`https://${siteUrl}/`);
    formattedUrls.push(`http://${siteUrl}/`);
    formattedUrls.push(`sc-domain:${siteUrl}`);
  }

  console.log("📋 Trying the following URL formats:", formattedUrls);

  // Check if there is an accessible URL format
  for (const formattedUrl of formattedUrls) {
    if (sites.includes(formattedUrl)) {
      console.log(`✅ Found an accessible URL format: ${formattedUrl}`);
      return formattedUrl;
    }
  }

  // If no accessible URL format is found
  const error = `${t("logs.errors.noSiteAccess")}\n${t("logs.errors.triedUrlFormats")}：\n${formattedUrls.join("\n")}`;
  console.error(error);
  throw new Error(error);
}

/**
 * Validate and format custom URLs
 */
export function checkCustomUrls(siteUrl: string, urls: string[]) {
  console.log(`🔍 Checking ${urls.length} URLs...`);
  const protocol = siteUrl.startsWith("http://") ? "http://" : "https://";
  const domain = siteUrl.replace("https://", "").replace("http://", "").replace("sc-domain:", "");

  const formattedUrls: string[] = urls.map((url) => {
    url = url.trim();
    let formattedUrl: string;
    if (url.startsWith("/")) {
      // Relative path (e.g., /about)
      formattedUrl = `${protocol}${domain}${url}`;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // Full URL (e.g., https://domain.com/about)
      formattedUrl = url;
    } else if (url.startsWith(domain)) {
      // Full URL without protocol (e.g., domain.com/about)
      formattedUrl = `${protocol}${url}`;
    } else {
      // Relative path without slash (e.g., about)
      formattedUrl = `${protocol}${domain}/${url}`;
    }
    console.log(`📝 Formatted URL: ${url} -> ${formattedUrl}`);
    return formattedUrl;
  });

  return formattedUrls;
}
