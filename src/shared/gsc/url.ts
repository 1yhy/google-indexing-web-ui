import { webmasters_v3 } from "googleapis";
import { fetchRetry } from "../utils";
import { convertToHTTP, convertToHTTPS, convertToSCDomain } from "@/lib/url";

/**
 * 转换为 Google Search Console 站点 URL 格式
 */
export function convertToSiteUrl(input: string) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input.endsWith("/") ? input : `${input}/`;
  }
  return `sc-domain:${input}`;
}

/**
 * 获取服务账号关联的站点列表
 */
export async function getSites(accessToken: string) {
  console.log("🔍 正在获取站点列表...");
  const sitesResponse = await fetchRetry("https://www.googleapis.com/webmasters/v3/sites", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (sitesResponse.status === 403) {
    const error = "🔐 服务账号没有访问任何站点的权限";
    console.error(error);
    throw new Error(error);
  }

  const sitesBody: webmasters_v3.Schema$SitesListResponse = await sitesResponse.json();

  if (!sitesBody.siteEntry) {
    const error = "❌ 未找到任何站点，请先在 Google Search Console 中添加站点并授权";
    console.error(error);
    throw new Error(error);
  }

  const sites = sitesBody.siteEntry.map((x) => x.siteUrl);
  console.log("📋 找到以下站点:", sites);
  return sites;
}

/**
 * 验证站点 URL 是否可访问
 */
export async function checkSiteUrl(
  accessToken: string | undefined | null,
  siteUrl: string | undefined | null,
): Promise<string> {
  if (!accessToken) throw new Error("访问令牌不能为空");
  if (!siteUrl) throw new Error("站点 URL 不能为空");

  console.log(`🔍 正在验证站点访问权限: ${siteUrl}`);
  const sites = await getSites(accessToken);
  const formattedUrls: string[] = [];

  // 转换站点 URL 为所有可能的格式
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
    // 处理纯域名的情况
    formattedUrls.push(`https://${siteUrl}/`);
    formattedUrls.push(`http://${siteUrl}/`);
    formattedUrls.push(`sc-domain:${siteUrl}`);
  }

  console.log("📋 尝试以下 URL 格式:", formattedUrls);

  // 检查是否有可访问的 URL 格式
  for (const formattedUrl of formattedUrls) {
    if (sites.includes(formattedUrl)) {
      console.log(`✅ 找到可访问的 URL 格式: ${formattedUrl}`);
      return formattedUrl;
    }
  }

  // 如果没有找到可访问的 URL 格式
  const error = `❌ 服务账号没有访问此站点的权限\n已尝试的 URL 格式：\n${formattedUrls.join("\n")}`;
  console.error(error);
  throw new Error(error);
}

/**
 * 验证和格式化自定义 URLs
 */
export function checkCustomUrls(siteUrl: string, urls: string[]) {
  console.log(`🔍 正在检查 ${urls.length} 个 URL 的格式...`);
  const protocol = siteUrl.startsWith("http://") ? "http://" : "https://";
  const domain = siteUrl.replace("https://", "").replace("http://", "").replace("sc-domain:", "");

  const formattedUrls: string[] = urls.map((url) => {
    url = url.trim();
    let formattedUrl: string;
    if (url.startsWith("/")) {
      // 相对路径 (例如: /about)
      formattedUrl = `${protocol}${domain}${url}`;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // 完整 URL (例如: https://domain.com/about)
      formattedUrl = url;
    } else if (url.startsWith(domain)) {
      // 不带协议的完整 URL (例如: domain.com/about)
      formattedUrl = `${protocol}${url}`;
    } else {
      // 不带斜杠的相对路径 (例如: about)
      formattedUrl = `${protocol}${domain}/${url}`;
    }
    console.log(`📝 格式化 URL: ${url} -> ${formattedUrl}`);
    return formattedUrl;
  });

  return formattedUrls;
}
