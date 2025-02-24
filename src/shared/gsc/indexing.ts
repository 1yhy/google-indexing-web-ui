import { SSEHandler, LogType } from "@/lib/sse";
import { getAccessToken } from "../auth";
import { getFromCache, updateCache } from "@/lib/url";
import { getStatusEmoji, getStatusDescription } from "@/lib/status";
import { Status, IndexResult } from "./types";
import { getPageIndexingStatus, requestIndexing } from "./api";

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
  logCallback?: LogCallback,
) {
  const CACHE_TIMEOUT = 1000 * 60 * 60 * 24 * 14; // 14 天缓存
  const results: IndexResult[] = [];
  const urlStatuses = new Map<string, Status>();
  const urlMessages = new Map<string, string>();

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
    await log("info", `🔎 处理站点: ${siteUrl}`);
    await log("info", `👉 找到 ${urls.length} 个待处理的 URL`);

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

      await log("info", `📦 开始处理第 ${batchNumber}/${batches} 批 URLs`);

      // 并行处理当前批次的 URLs
      await Promise.all(
        batchUrls.map(async (url) => {
          try {
            await log("info", `📄 正在处理: ${url}`, url);

            // 检查缓存
            const needsRecheck = await shouldRecheck(url);
            let status: Status;

            if (needsRecheck) {
              status = await getPageIndexingStatus(accessToken, siteUrl, url);
              // 更新缓存
              await updateCache(appId, url, status);
              await log("info", `📝 更新缓存: ${url} (状态: ${status})`, url, status);
            } else {
              const cache = await getFromCache(appId, url);
              console.log(`📦 缓存数据:`, cache);

              // 检查缓存状态是否需要更新
              const shouldUpdate =
                !cache?.status ||
                cache.status === Status.URLIsUnknownToGoogle ||
                cache.status === Status.CrawledCurrentlyNotIndexed ||
                cache.status === Status.DiscoveredCurrentlyNotIndexed;

              if (shouldUpdate) {
                status = await getPageIndexingStatus(accessToken, siteUrl, url);
                await updateCache(appId, url, status);
                await log("info", `📝 更新缓存: ${url} (状态: ${status})`, url, status);
              } else {
                status = cache.status as Status;
                await log("info", `📖 使用缓存: ${url} (状态: ${status})`, url, status);
              }
            }

            console.log(`🔍 URL ${url} 的当前状态: ${status}`);

            // 更新统计
            switch (status) {
              case Status.SubmittedAndIndexed:
                urlStatuses.set(url, status);
                urlMessages.set(url, `✅ 已被索引: ${url}`);
                await log("success", `✅ 已被索引: ${url}`, url, status);
                break;
              case Status.CrawledCurrentlyNotIndexed:
                urlStatuses.set(url, status);
                urlMessages.set(url, `👀 已爬取但未索引: ${url}`);
                await log("info", `👀 已爬取但未索引: ${url}`, url, status);
                // 已爬取但未索引的页面需要提交索引请求
                try {
                  await requestIndexing(accessToken, url);
                  urlStatuses.set(url, Status.Pending);
                  urlMessages.set(url, `🚀 已提交索引请求: ${url}`);
                  await log("success", `🚀 已提交索引请求: ${url}`, url, Status.Pending);
                } catch (error) {
                  urlStatuses.set(url, Status.Failed);
                  urlMessages.set(url, `❌ 提交索引请求失败: ${error instanceof Error ? error.message : "未知错误"}`);
                  await log(
                    "error",
                    `❌ 提交索引请求失败: ${url} - ${error instanceof Error ? error.message : "未知错误"}`,
                    url,
                    Status.Failed,
                  );
                }
                break;
              case Status.URLIsUnknownToGoogle:
              case Status.DiscoveredCurrentlyNotIndexed:
                urlStatuses.set(url, status);
                urlMessages.set(url, `❓ Google 未知页面: ${url}`);
                await log("info", `❓ Google 未知页面: ${url}`, url, status);
                // 未知页面需要提交索引请求
                try {
                  await requestIndexing(accessToken, url);
                  urlStatuses.set(url, Status.Pending);
                  urlMessages.set(url, `🚀 已提交索引请求: ${url}`);
                  await log("success", `🚀 已提交索引请求: ${url}`, url, Status.Pending);
                } catch (error) {
                  urlStatuses.set(url, Status.Failed);
                  urlMessages.set(url, `❌ 提交索引请求失败: ${error instanceof Error ? error.message : "未知错误"}`);
                  await log(
                    "error",
                    `❌ 提交索引请求失败: ${url} - ${error instanceof Error ? error.message : "未知错误"}`,
                    url,
                    Status.Failed,
                  );
                }
                break;
              case Status.Error:
              case Status.Forbidden:
              case Status.RateLimited:
                urlStatuses.set(url, status);
                urlMessages.set(url, `❌ 处理失败: ${url}`);
                await log("error", `❌ 处理失败: ${url}`, url, status);
                break;
              default:
                urlStatuses.set(url, status);
                urlMessages.set(url, `❓ 未知状态: ${status}`);
                await log("info", `❓ 未知状态: ${status}`, url, status);
                break;
            }

            const result = {
              url,
              status,
              timestamp: new Date(),
            };
            batchResults.push(result);
            results.push(result);

            // 只发送一次状态描述，不重复记录
            await log("info", `${getStatusEmoji(status)} ${getStatusDescription(status)}: ${url}`, url, status);
          } catch (error) {
            urlStatuses.set(url, Status.Failed);
            urlMessages.set(url, `❌ 处理失败: ${error instanceof Error ? error.message : "未知错误"}`);
            await log(
              "error",
              `❌ 处理失败: ${url} - ${error instanceof Error ? error.message : "未知错误"}`,
              url,
              Status.Failed,
            );

            const result = {
              url,
              status: Status.Failed,
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
      // 只有在不是最后一批时才发送进度
      if (batchNumber < batches) {
        await log("progress", `进度：${progress.toFixed(1)}%`, undefined, undefined, {
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
        });
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
    await log("info", `\n📈 所有 ${urls.length} 个页面处理完成，最终统计：`);
    if (finalStats.indexed > 0) await log("info", `• ✅ 已索引页面：${finalStats.indexed} 个`);
    if (finalStats.submitted > 0) await log("info", `• 🚀 已提交索引请求：${finalStats.submitted} 个`);
    if (finalStats.crawled > 0) await log("info", `• 👀 已爬取页面：${finalStats.crawled} 个`);
    if (finalStats.unknown > 0) await log("info", `• ❓ 未知页面：${finalStats.unknown} 个`);
    if (finalStats.error > 0) await log("info", `• ❌ 处理失败：${finalStats.error} 个`);

    // 发送最终统计信息和完成标记
    await log("success", "✅ 所有 URL 处理完成", undefined, undefined, {
      progress: 100,
      stats: finalStats,
      isCompleted: true,
    });

    // 关闭 SSE 连接
    sse.close();

    return results;
  } catch (error) {
    console.error("处理 URLs 时发生错误:", error);
    await log("error", `处理过程中发生错误: ${error instanceof Error ? error.message : "未知错误"}`);

    // 发生错误时也关闭连接
    sse.close();
    throw error;
  }
}
