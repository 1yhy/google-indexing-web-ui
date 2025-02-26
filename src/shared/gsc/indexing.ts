import { SSEHandler, LogType } from "@/lib/sse";
import { getAccessToken } from "../auth";
import { getFromCache, updateCache } from "@/lib/url";
import { getStatusEmoji, getStatusDescription } from "@/lib/status";
import { Status, IndexResult } from "./types";
import { getPageIndexingStatus, requestIndexing } from "./api";
import { t } from "@/i18n";

type LogCallback = (type: LogType, message: string, url?: string, status?: string, data?: any) => Promise<void>;

/**
 * 批量处理 URLs 的索引状态
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
  const CACHE_TIMEOUT = 1000 * 60 * 60 * 24 * 14; // 14 天缓存
  const results: IndexResult[] = [];
  const urlStatuses = new Map<string, Status>();

  const log = async (
    type: "info" | "error" | "success" | "progress",
    messageKey: string,
    url?: string,
    status?: string,
    data?: any,
    params?: Record<string, any>
  ) => {
    if (logCallback) {
      const message = t(`logs.${messageKey}`, params || {});
      await logCallback(type, message, url, status, data);
    }
  };

  try {
    await log("info", "site_processing", undefined, undefined, undefined, { siteUrl });
    await log("info", "urls_found", undefined, undefined, undefined, { count: urls.length });

    // 获取访问令牌
    const accessToken = await getAccessToken(clientEmail, privateKey);
    if (!accessToken) {
      throw new Error("获取访问令牌失败");
    }

    // 定义需要重新检查的状态
    const indexableStatuses = [
      Status.DiscoveredCurrentlyNotIndexed,
      Status.CrawledCurrentlyNotIndexed,
      Status.URLIsUnknownToGoogle,
      Status.Forbidden,
      Status.Error,
      Status.RateLimited,
    ];

    // 检查是否需要重新验证状态
    const shouldRecheck = async (url: string) => {
      const cache = await getFromCache(appId, url);
      if (!cache) return true;

      const isIndexableStatus = indexableStatuses.includes(cache.status as Status);
      const isOld = new Date(cache.lastCheckedAt) < new Date(Date.now() - CACHE_TIMEOUT);
      return isIndexableStatus && isOld;
    };

    // 批量处理 URLs
    const batchSize = 10; // 每批处理的 URL 数量
    const batches = Math.ceil(urls.length / batchSize);

    for (let i = 0; i < urls.length; i += batchSize) {
      const batchUrls = urls.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchResults: IndexResult[] = [];

      await log("info", "batch_processing", undefined, undefined, undefined, { current: batchNumber, total: batches });

      // 并行处理当前批次的 URLs
      await Promise.all(
        batchUrls.map(async (url) => {
          try {
            await log("info", "processing_url", url, undefined, undefined, { url });

            // 检查缓存
            const needsRecheck = await shouldRecheck(url);
            let status: Status;

            try {
              if (needsRecheck) {
                status = await getPageIndexingStatus(accessToken, siteUrl, url);
                // 更新缓存
                await updateCache(appId, url, status);
                await log("info", "updating_cache", url, status, undefined, { url, status });
              } else {
                const cache = await getFromCache(appId, url);
                if (!cache?.status) {
                  status = await getPageIndexingStatus(accessToken, siteUrl, url);
                  await updateCache(appId, url, status);
                  await log("info", "updating_cache", url, status, undefined, { url, status });
                } else {
                  status = cache.status as Status;
                  await log("info", "using_cache", url, status, undefined, { url, status });
                }
              }
            } catch (error) {
              // 如果获取状态失败，将状态设置为 Failed
              status = Status.Failed;
              await log("error", "processing_failed", url, status, undefined, { url });
              urlStatuses.set(url, status);
              throw error; // 重新抛出错误以触发外层错误处理
            }

            // 更新统计
            switch (status) {
              case Status.SubmittedAndIndexed:
                urlStatuses.set(url, status);
                await log("success", "indexed", url, status, undefined, { url });
                break;
              case Status.CrawledCurrentlyNotIndexed:
              case Status.URLIsUnknownToGoogle:
              case Status.DiscoveredCurrentlyNotIndexed:
                urlStatuses.set(url, status);
                await log("info", status === Status.CrawledCurrentlyNotIndexed ? "crawled_not_indexed" : "unknown_to_google", url, status, undefined, { url });
                try {
                  await requestIndexing(accessToken, url);
                  urlStatuses.set(url, Status.Pending);
                  await log("success", "submitted_for_indexing", url, Status.Pending, undefined, { url });
                } catch (error) {
                  status = Status.Failed;
                  urlStatuses.set(url, status);
                  await log(
                    "error",
                    "submission_failed",
                    url,
                    status,
                    undefined,
                    { url, error: error instanceof Error ? error.message : "未知错误" }
                  );
                }
                break;
              case Status.Error:
              case Status.Forbidden:
              case Status.RateLimited:
                urlStatuses.set(url, status);
                await log("error", "processing_failed", url, status, undefined, { url });
                break;
              default:
                urlStatuses.set(url, status);
                await log("info", "unknown_status", url, status, undefined, { status });
                break;
            }

            const result = {
              url,
              status,
              timestamp: new Date(),
            };
            batchResults.push(result);
            results.push(result);

            // 使用翻译后的状态消息
            const statusMessage = getStatusDescription(status);
            await log("info", "url_status_message", url, status, undefined, {
              url,
              emoji: getStatusEmoji(status),
              status: statusMessage
            });
          } catch (error) {
            // 确保错误状态被正确设置和保持
            const errorStatus = Status.Failed;
            if (!urlStatuses.has(url)) {
              urlStatuses.set(url, errorStatus);
            }

            await log(
              "error",
              "processing_failed",
              url,
              errorStatus,
              undefined,
              { url }
            );

            const result = {
              url,
              status: errorStatus,
              message: error instanceof Error ? error.message : "未知错误",
              timestamp: new Date(),
            };
            batchResults.push(result);
            results.push(result);
          }
        }),
      );

      // 发送进度信息
      const progress = (batchNumber / batches) * 100;
      if (batchNumber < batches) {
        await log("progress", "progress", undefined, undefined, {
          progress,
          stats: {
            total: urls.length,
            indexed: Array.from(urlStatuses.values()).filter((s) => s === Status.SubmittedAndIndexed).length,
            submitted: Array.from(urlStatuses.values()).filter((s) => s === Status.Pending).length,
            crawled: Array.from(urlStatuses.values()).filter((s) => s === Status.CrawledCurrentlyNotIndexed).length,
            error: Array.from(urlStatuses.values()).filter((s) =>
              [Status.Error, Status.Forbidden, Status.RateLimited, Status.Failed].includes(s),
            ).length,
            unknown: Array.from(urlStatuses.values()).filter((s) =>
              [Status.URLIsUnknownToGoogle, Status.DiscoveredCurrentlyNotIndexed].includes(s),
            ).length,
          },
        }, { progress: progress.toFixed(1) });
      }
    }

    // 计算并发送最终统计信息
    const finalStats = {
      total: urls.length,
      indexed: Array.from(urlStatuses.values()).filter((s) => s === Status.SubmittedAndIndexed).length,
      submitted: Array.from(urlStatuses.values()).filter((s) => s === Status.Pending).length,
      crawled: Array.from(urlStatuses.values()).filter((s) => s === Status.CrawledCurrentlyNotIndexed).length,
      error: Array.from(urlStatuses.values()).filter((s) =>
        [Status.Error, Status.Forbidden, Status.RateLimited, Status.Failed].includes(s),
      ).length,
      unknown: Array.from(urlStatuses.values()).filter((s) =>
        [Status.URLIsUnknownToGoogle, Status.DiscoveredCurrentlyNotIndexed].includes(s),
      ).length,
    };

    // 发送详细统计信息
    await log("info", "final_stats_header", undefined, undefined, undefined, { total: urls.length });
    if (finalStats.indexed > 0) await log("info", "indexed_pages", undefined, undefined, undefined, { count: finalStats.indexed });
    if (finalStats.submitted > 0) await log("info", "submitted_pages", undefined, undefined, undefined, { count: finalStats.submitted });
    if (finalStats.crawled > 0) await log("info", "crawled_pages", undefined, undefined, undefined, { count: finalStats.crawled });
    if (finalStats.unknown > 0) await log("info", "unknown_pages", undefined, undefined, undefined, { count: finalStats.unknown });
    if (finalStats.error > 0) await log("info", "failed_pages", undefined, undefined, undefined, { count: finalStats.error });

    // 发送最终统计信息和完成标记
    await log("success", "all_completed", undefined, undefined, {
      progress: 100,
      stats: finalStats,
      isCompleted: true,
    });

    // 关闭 SSE 连接
    sse.close();

    return results;
  } catch (error) {
    console.error("处理 URLs 时发生错误:", error);
    await log("error", "process_error", undefined, undefined, undefined, { error: error instanceof Error ? error.message : "未知错误" });

    // 发生错误时也关闭连接
    sse.close();
    throw error;
  }
}
