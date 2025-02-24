import { fetchRetry } from "../utils";
import { Status } from "./types";
import { QUOTA } from "@/lib/google";

/**
 * API 响应状态到内部状态的映射
 */
const API_STATUS_MAP: Record<string, Status> = {
  URL_IS_ON_GOOGLE: Status.SubmittedAndIndexed,
  "Submitted and indexed": Status.SubmittedAndIndexed,
  DUPLICATE_WITHOUT_USER_SELECTED_CANONICAL: Status.DuplicateWithoutUserSelectedCanonical,
  CRAWLED_CURRENTLY_NOT_INDEXED: Status.CrawledCurrentlyNotIndexed,
  "Crawled - currently not indexed": Status.CrawledCurrentlyNotIndexed,
  DISCOVERED_CURRENTLY_NOT_INDEXED: Status.DiscoveredCurrentlyNotIndexed,
  "Discovered - currently not indexed": Status.DiscoveredCurrentlyNotIndexed,
  PAGE_WITH_REDIRECT: Status.PageWithRedirect,
  URL_IS_UNKNOWN_TO_GOOGLE: Status.URLIsUnknownToGoogle,
  "URL is unknown to Google": Status.URLIsUnknownToGoogle,
  RATE_LIMITED: Status.RateLimited,
  FORBIDDEN: Status.Forbidden,
  ERROR: Status.Error,
};

/**
 * 获取页面的索引状态
 */
export async function getPageIndexingStatus(
  accessToken: string | undefined | null,
  siteUrl: string | undefined | null,
  inspectionUrl: string | undefined | null,
): Promise<Status> {
  if (!accessToken) throw new Error("访问令牌不能为空");
  if (!siteUrl) throw new Error("站点 URL 不能为空");
  if (!inspectionUrl) throw new Error("检查 URL 不能为空");

  console.log(`🔍 正在获取页面索引状态: ${inspectionUrl}`);

  try {
    const response = await fetchRetry(`https://searchconsole.googleapis.com/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        inspectionUrl,
        siteUrl,
      }),
    });

    const responseText = await response.text();
    console.log(`📡 API 响应状态码: ${response.status}`);
    console.log(`📡 API 响应内容: ${responseText}`);

    if (response.status === 403) {
      throw new Error(`🔐 服务账号没有访问此站点的权限\n响应内容：${responseText}`);
    }

    if (response.status >= 300) {
      if (response.status === 429) {
        throw new Error(`🚦 请求频率超限\n响应内容：${responseText}`);
      } else {
        throw new Error(`❌ 获取索引状态失败\n响应状态码: ${response.status}\n响应内容：${responseText}`);
      }
    }

    const body = JSON.parse(responseText);
    if (!body.inspectionResult?.indexStatusResult?.coverageState) {
      throw new Error(`❌ 无效的响应格式: ${responseText}`);
    }
    const apiStatus = body.inspectionResult.indexStatusResult.coverageState;
    const status = API_STATUS_MAP[apiStatus] || Status.Error;

    console.log(`📊 页面当前状态: ${status}`);
    return status;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `❌ 获取索引状态失败: ${error}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * 获取发布元数据
 */
export async function getPublishMetadata(accessToken: string, url: string, options?: { retriesOnRateLimit: number }) {
  console.log(`🔍 正在获取发布元数据: ${url}`);
  const response = await fetchRetry(
    `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodeURIComponent(url)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const responseText = await response.text();
  console.log(`📡 API 响应状态码: ${response.status}`);
  console.log(`📡 API 响应内容: ${responseText}`);

  if (response.status === 403) {
    const error = `🔐 服务账号没有访问此站点的权限\n响应内容：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  if (response.status === 429) {
    if (options?.retriesOnRateLimit && options?.retriesOnRateLimit > 0) {
      const RPM_WATING_TIME = (QUOTA.rpm.retries - options.retriesOnRateLimit + 1) * QUOTA.rpm.waitingTime;
      const message = `🔄 读取请求超出频率限制。剩余重试次数: ${
        options.retriesOnRateLimit
      }。等待 ${RPM_WATING_TIME / 1000} 秒后重试...`;
      console.log(message);
      await new Promise((resolve) => setTimeout(resolve, RPM_WATING_TIME));
      return await getPublishMetadata(accessToken, url, { retriesOnRateLimit: options.retriesOnRateLimit - 1 });
    } else {
      const error = `🚦 请求频率超限\n配额信息：https://developers.google.com/search/apis/indexing-api/v3/quota-pricing#quota\n使用情况：https://console.cloud.google.com/apis/enabled`;
      console.error(error);
      throw new Error(error);
    }
  }

  if (response.status >= 500) {
    const error = `❌ 获取发布元数据失败\n响应状态码: ${response.status}\n响应内容：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  return response.status;
}

/**
 * 请求索引 URL
 */
export async function requestIndexing(
  accessToken: string | undefined | null,
  url: string | undefined | null,
): Promise<void> {
  if (!accessToken) throw new Error("访问令牌不能为空");
  if (!url) throw new Error("URL 不能为空");

  console.log(`🔄 正在请求索引: ${url}`);

  const response = await fetchRetry("https://indexing.googleapis.com/v3/urlNotifications:publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      url: url,
      type: "URL_UPDATED",
    }),
  });

  const responseText = await response.text();
  console.log(`📡 API 响应状态码: ${response.status}`);
  console.log(`📡 API 响应内容: ${responseText}`);

  if (response.status === 403) {
    const error = `🔐 服务账号没有访问此站点的权限\n响应内容：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  if (response.status >= 300) {
    if (response.status === 429) {
      const error = `🚦 请求频率超限\n响应内容：${responseText}`;
      console.error(error);
      throw new Error(error);
    } else {
      const error = `❌ 提交索引请求失败\n响应状态码: ${response.status}\n响应内容：${responseText}`;
      console.error(error);
      throw new Error(error);
    }
  }

  console.log(`✅ 索引请求已提交: ${url}`);
}
