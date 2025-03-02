import { SSEHandler, LogType } from "@/lib/sse";
import { getAccessToken } from "../auth";
import { getFromCache, updateCache } from "@/lib/url";
import { Status, IndexResult } from "./types";
import { getPageIndexingStatus, requestIndexing } from "./api";
import { t } from "@/i18n";

type LogCallback = (type: LogType, message: string, url?: string, status?: string, data?: any) => Promise<void>;

/**
 * Batch process URLs indexing status
 */
export async function indexUrls(
  clientEmail: string,
  privateKey: string,
  siteUrl: string,
  urls: string[],
  sse: SSEHandler,
  appId: string,
  logCallback?: LogCallback
) {
  const CACHE_TIMEOUT = 1000 * 60 * 60 * 24 * 14; // 14 days cache
  const results: IndexResult[] = [];
  const urlStatuses = new Map<string, Status>();

  const log = async (
    type: "info" | "error" | "success" | "progress",
    message: string,
    url?: string,
    status?: string,
    data?: any,
  ) => {
    if (logCallback) {
      await logCallback(type, message, url, status, data);
    }
  };

  try {
    await log("info", t("logs.site_processing", { siteUrl }));
    await log("info", t("logs.urls_found", { count: urls.length }));

    // Get access token
    const accessToken = await getAccessToken(clientEmail, privateKey);
    if (!accessToken) {
      throw new Error(t('logs.errors.tokenFailed'));
    }

    // Define statuses that need to be rechecked
    const indexableStatuses = [
      Status.DiscoveredCurrentlyNotIndexed,
      Status.CrawledCurrentlyNotIndexed,
      Status.URLIsUnknownToGoogle,
      Status.Forbidden,
      Status.Error,
      Status.RateLimited,
    ];

    // Check if status needs to be rechecked
    const shouldRecheck = async (url: string) => {
      const cache = await getFromCache(appId, url);
      if (!cache) return true;

      const isIndexableStatus = indexableStatuses.includes(cache.status as Status);
      const isOld = new Date(cache.lastCheckedAt) < new Date(Date.now() - CACHE_TIMEOUT);
      return isIndexableStatus && isOld;
    };

    // Batch process URLs
    const batchSize = 10; // Number of URLs to process per batch
    const batches = Math.ceil(urls.length / batchSize);

    for (let i = 0; i < urls.length; i += batchSize) {
      const batchUrls = urls.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchResults: IndexResult[] = [];

      await log("info", t("logs.batch_processing", { current: batchNumber, total: batches }));

      // Process current batch of URLs in parallel
      await Promise.all(
        batchUrls.map(async (url) => {
          try {
            await log("info", t("logs.processing_url", { url }), url);

            // Check cache
            const needsRecheck = await shouldRecheck(url);
            let status: Status;

            try {
              if (needsRecheck) {
                status = await getPageIndexingStatus(accessToken, siteUrl, url);
                // Update cache
                await updateCache(appId, url, status);
                await log("info", t("logs.updating_cache", { url, status }), url, status);
              } else {
                const cache = await getFromCache(appId, url);
                if (!cache?.status) {
                  status = await getPageIndexingStatus(accessToken, siteUrl, url);
                  await updateCache(appId, url, status);
                  await log("info", t("logs.updating_cache", { url, status }), url, status);
                } else {
                  status = cache.status as Status;
                  await log("info", t("logs.using_cache", { url, status }), url, status);
                }
              }
            } catch (error) {
              status = Status.Error;
              await log("error", t("logs.processing_failed", { url, status }), url, status);
              throw error;
            }
            urlStatuses.set(url, status);

            // Update stats
            switch (status) {
              case Status.SubmittedAndIndexed:
                await log("success", t("logs.indexed", { url }), url, status);
                break;
              case Status.Error:
                await log('error', `❌ ${t("logs.errors.indexStatusFailed")}`, url, status)
                break;
              case Status.Forbidden:
                await log("error", `🔐 ${t("logs.errors.noSiteAccess")}`, url, status);
                break;
              case Status.RateLimited:
                await log("error", `🚦 ${t("logs.errors.rateLimited")}`, url, status);
                break;
            }

            if (indexableStatuses.includes(status)) {
                try {
                  await log("info", status === Status.CrawledCurrentlyNotIndexed ? t("logs.crawled_not_indexed", { url }) : t("logs.unknown_to_google", { url }), url, status);
                  await requestIndexing(accessToken, url);
                  status = Status.Submitted;
                  urlStatuses.set(url, status);
                  await log("success", t("logs.submitted_for_indexing", { url }), url, status);
                } catch (error) {
                  if ((error as any).code !== 403 && (error as any).code !== 429){
                    status = Status.Error
                    urlStatuses.set(url, status);
                  }
                  await log(
                    "error",
                    t("logs.submission_failed", { url, error: error instanceof Error ? error.message : "未知错误" }),
                    url,
                    status
                  );
                }
            }

            const result = {
              url,
              status,
              timestamp: new Date(),
            };
            batchResults.push(result);
            results.push(result);
          } catch (error) {
            // Ensure error status is correctly set and maintained
            const errorStatus = Status.Error;
            if (!urlStatuses.has(url)) {
              urlStatuses.set(url, errorStatus);
            }

            await log(
              "error",
              t("logs.processing_failed", { url, status: errorStatus })
            );

            const result = {
              url,
              status: errorStatus,
              message: error instanceof Error ? error.message : "Unknown Error",
              timestamp: new Date(),
            };
            batchResults.push(result);
            results.push(result);
          }
        }),
      );

      // Send progress info
      const progress = (batchNumber / batches) * 100;
      if (batchNumber < batches) {
        await log("progress", t("logs.progress", { progress: progress.toFixed(1) }), undefined, undefined, {
          progress,
          stats: {
            total: urls.length,
            indexed: Array.from(urlStatuses.values()).filter((s) => s === Status.SubmittedAndIndexed).length,
            submitted: Array.from(urlStatuses.values()).filter((s) => s === Status.Submitted).length,
            crawled: Array.from(urlStatuses.values()).filter((s) => s === Status.CrawledCurrentlyNotIndexed).length,
            error: Array.from(urlStatuses.values()).filter((s) =>
              [Status.Error, Status.Forbidden, Status.RateLimited].includes(s),
            ).length,
            unknown: Array.from(urlStatuses.values()).filter((s) =>
              [Status.URLIsUnknownToGoogle, Status.DiscoveredCurrentlyNotIndexed].includes(s),
            ).length,
          },
        });
      }
    }

    // Calculate and send final stats
    const finalStats = {
      total: urls.length,
      indexed: Array.from(urlStatuses.values()).filter((s) => s === Status.SubmittedAndIndexed).length,
      submitted: Array.from(urlStatuses.values()).filter((s) => s === Status.Submitted).length,
      crawled: Array.from(urlStatuses.values()).filter((s) => s === Status.CrawledCurrentlyNotIndexed).length,
      error: Array.from(urlStatuses.values()).filter((s) =>
        [Status.Error, Status.Forbidden, Status.RateLimited].includes(s),
      ).length,
      unknown: Array.from(urlStatuses.values()).filter((s) =>
        [Status.URLIsUnknownToGoogle, Status.DiscoveredCurrentlyNotIndexed].includes(s),
      ).length,
    };

    // Send detailed stats
    await log("info", t("logs.final_stats_header", { total: urls.length }));
    if (finalStats.indexed > 0) await log("info", t("logs.indexed_pages", { count: finalStats.indexed }));
    if (finalStats.submitted > 0) await log("info", t("logs.submitted_pages", { count: finalStats.submitted }));
    if (finalStats.crawled > 0) await log("info", t("logs.crawled_pages", { count: finalStats.crawled }));
    if (finalStats.unknown > 0) await log("info", t("logs.unknown_pages", { count: finalStats.unknown }));
    if (finalStats.error > 0) await log("info", t("logs.failed_pages", { count: finalStats.error }));

    // Send final stats and completion mark
    await log("success", t("logs.all_completed"), undefined, undefined, {
      progress: 100,
      stats: finalStats,
      isCompleted: true,
    });

    // Close SSE connection
    sse.close();

    return results;
  } catch (error) {
    console.error("Error processing URLs:", error);
    await log("error", t("logs.process_error", { error: error instanceof Error ? error.message : "Unknown Error" }));

    // Close SSE connection when error occurs
    sse.close();
    throw error;
  }
}
