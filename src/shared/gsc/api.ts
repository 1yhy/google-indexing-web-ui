import { fetchRetry } from "../utils";
import { Status } from "./types";
import { QUOTA } from "@/lib/google";
import { t } from "@/i18n";

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
  inspectionUrl: string | undefined | null
): Promise<Status> {
  if (!accessToken) throw new Error(t("logs.errors.accessTokenRequired"));
  if (!siteUrl) throw new Error(t("logs.errors.siteUrlRequired"));
  if (!inspectionUrl) throw new Error(t("logs.errors.inspectionUrlRequired"));

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
      throw new Error(`🔐 ${t("logs.errors.noSiteAccess")}\n响应内容：${responseText}`);
    }

    if (response.status >= 300) {
      if (response.status === 429) {
        throw new Error(`🚦 ${t("logs.errors.rateLimited")}\n响应内容：${responseText}`);
      } else {
        throw new Error(`❌ ${t("logs.errors.indexStatusFailed")}\n${t("logs.errors.responseStatus")}: ${response.status}\n${t("logs.errors.responseContent")}：${responseText}`);
      }
    }

    const body = JSON.parse(responseText);
    if (!body.inspectionResult?.indexStatusResult?.coverageState) {
      throw new Error(`❌ ${t("logs.errors.invalidResponseFormat")}: ${responseText}`);
    }
    const apiStatus = body.inspectionResult.indexStatusResult.coverageState;
    const status = API_STATUS_MAP[apiStatus] || Status.Error;

    console.log(`📊 页面当前状态: ${status}`);
    return status;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `❌ ${t("logs.errors.indexStatusFailed")}: ${error}`;
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
    }
  );

  const responseText = await response.text();
  console.log(`📡 API 响应状态码: ${response.status}`);
  console.log(`📡 API 响应内容: ${responseText}`);

  if (response.status === 403) {
    const error = `🔐 ${t("logs.errors.noSiteAccess")}\n响应内容：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  if (response.status === 429) {
    if (options?.retriesOnRateLimit && options?.retriesOnRateLimit > 0) {
      const RPM_WATING_TIME = (QUOTA.rpm.retries - options.retriesOnRateLimit + 1) * QUOTA.rpm.waitingTime;
      const message = `🔄 ${t("logs.errors.rateLimited")}。剩余重试次数: ${
        options.retriesOnRateLimit
      }。等待 ${RPM_WATING_TIME / 1000} 秒后重试...`;
      console.log(message);
      await new Promise((resolve) => setTimeout(resolve, RPM_WATING_TIME));
      return await getPublishMetadata(accessToken, url, { retriesOnRateLimit: options.retriesOnRateLimit - 1 });
    } else {
      const error = `🚦 ${t("logs.errors.quotaExceeded")}`;
      console.error(error);
      throw new Error(error);
    }
  }

  if (response.status >= 500) {
    const error = `❌ ${t("logs.errors.publishMetadataFailed")}\n${t("logs.errors.responseStatus")}: ${response.status}\n${t("logs.errors.responseContent")}：${responseText}`;
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
  url: string | undefined | null
): Promise<void> {
  if (!accessToken) throw new Error(t("logs.errors.accessTokenRequired"));
  if (!url) throw new Error(t("logs.errors.urlRequired"));

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
    const error = `🔐 ${t("logs.errors.noSiteAccess")}\n响应内容：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  if (response.status >= 300) {
    if (response.status === 429) {
      const error = `🚦 ${t("logs.errors.rateLimited")}\n响应内容：${responseText}`;
      console.error(error);
      throw new Error(error);
    } else {
      const error = `❌ ${t("logs.errors.indexingRequestFailed")}\n${t("logs.errors.responseStatus")}: ${response.status}\n${t("logs.errors.responseContent")}：${responseText}`;
      console.error(error);
      throw new Error(error);
    }
  }

  console.log(`✅ 索引请求已提交: ${url}`);
}
