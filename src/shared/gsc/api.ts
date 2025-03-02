import { fetchRetry } from "../utils";
import { Status } from "./types";
import { t } from "@/i18n";

/**
 * get page indexing status
 */
export async function getPageIndexingStatus(
  accessToken: string | undefined | null,
  siteUrl: string | undefined | null,
  inspectionUrl: string | undefined | null
): Promise<Status> {
  if (!accessToken) throw new Error(t("logs.errors.accessTokenRequired"));
  if (!siteUrl) throw new Error(t("logs.errors.siteUrlRequired"));
  if (!inspectionUrl) throw new Error(t("logs.errors.inspectionUrlRequired"));

  console.log(`🔍 Getting page indexing status: ${inspectionUrl}`);

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
    console.log(`📡 API response status code: ${response.status}`);
    console.log(`📡 API response content: ${responseText}`);

    if (response.status === 403) {
      return Status.Forbidden;
    }

    if (response.status >= 300) {
      if (response.status === 429) {
        return Status.RateLimited;
      } else {
        return Status.Error;
      }
    }

    const body = JSON.parse(responseText);
    const status = body.inspectionResult.indexStatusResult.coverageState;

    console.log(`📊 Page current status: ${status}`);
    return status;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `❌ ${t("logs.errors.indexStatusFailed")}: ${error}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * request indexing URL
 */
export async function requestIndexing(
  accessToken: string | undefined | null,
  url: string | undefined | null
): Promise<void> {
  if (!accessToken) throw new Error(t("logs.errors.accessTokenRequired"));
  if (!url) throw new Error(t("logs.errors.urlRequired"));

  console.log(`🔄 Requesting indexing: ${url}`);

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
  console.log(`📡 API response status code: ${response.status}`);
  console.log(`📡 API response content: ${responseText}`);

  if (response.status === 403) {
    const error = `🔐 ${t("logs.errors.noSiteAccess")}\n${t("logs.errors.responseContent")}：${responseText}`;
    console.error(error);
    throw new Error(error);
  }

  if (response.status >= 300) {
    if (response.status === 429) {
      const error = `🚦 ${t("logs.errors.rateLimited")}\n${t("logs.errors.responseContent")}：${responseText}`;
      console.error(error);
      throw {
        code: response.status,
        message: error,
      };
    } else {
      const error = `❌ ${t("logs.errors.indexingRequestFailed")}\n${t("logs.errors.responseStatus")}: ${response.status}\n${t("logs.errors.responseContent")}：${responseText}`;
      console.error(error);
      throw {
        code: response.status,
        message: error,
      };
    }
  }

  if (response.status >= 500) {
    const error = `❌ ${t("logs.errors.publishMetadataFailed")}\n${t("logs.errors.responseStatus")}: ${response.status}\n${t("logs.errors.responseContent")}：${responseText}`;
    console.error(error);
    throw {
      code: response.status,
      message: error,
    };
  }

  console.log(`✅ Indexing Request has submitted: ${url}`);
}
