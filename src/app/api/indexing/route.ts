import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/shared/auth";
import { checkSiteUrl, indexUrls } from "@/shared/gsc";
import { getSitemapPages } from "@/shared/sitemap";
import { createSSEResponse, LogType } from "@/lib/sse";
import crypto from "crypto";
import { Status } from "@/shared/gsc/types";
import { createLog } from "../logs/service";
import { auth } from "@/auth";
import { locales, defaultLocale } from "@/i18n";
import { t } from "@/i18n";
import { I18nService } from "@/i18n";

// 使用 Map 来存储正在处理的请求和其状态
interface RequestState {
  batchId: string;
  processedUrls: Set<string>;
  urlStatuses: Map<string, Status>;
  isProcessing: boolean;
  lastProgress: number;
  startTime: number;
  retryCount: number;
}

const activeRequests = new Map<string, RequestState>();
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5秒

// 重试函数
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function handleIndexing(appId: string, rawUrls: string[] = [], saveLog: boolean = true, requestId: string) {
  // 检查是否存在进行中的请求
  let requestState = activeRequests.get(requestId);
  const isReconnection = !!requestState;

  if (!requestState) {
    // 新请求：初始化状态
    requestState = {
      batchId: crypto.randomUUID(),
      processedUrls: new Set<string>(),
      urlStatuses: new Map<string, Status>(),
      isProcessing: true,
      lastProgress: 0,
      startTime: Date.now(),
      retryCount: 0
    };
    activeRequests.set(requestId, requestState);
  }

  return createSSEResponse(async (sse) => {
    // 创建日志函数
    const log = async (type: LogType, message: string, url?: string, status?: string, data?: any) => {
      if (saveLog) {
        await createLog({
          batchId: requestState!.batchId,
          appId,
          type,
          message,
          url,
          status: status as Status,
          timestamp: new Date(),
        });
      }
      sse.send(type, message, data);
    };

    try {
      // 如果是重连，发送恢复消息和当前进度
      if (isReconnection) {
        await log("info", t("logs.reconnected"));
        await log("progress", t("logs.progress", { progress: requestState.lastProgress }), undefined, undefined, {
          progress: requestState.lastProgress,
          stats: getStats(requestState.urlStatuses),
        });
      }

      // 获取应用信息
      const app = await retryWithDelay(async () => {
        const result = await prisma.app.findUnique({
          where: { id: appId },
        });
        if (!result || !result.jsonKey || !result.domain) {
          throw new Error(t("logs.errors.appNotFound"));
        }
        return result;
      });

      if (!isReconnection) {
        await log("info", t("logs.starting"));
      }

      // 解析 JSON Key
      let credentials;
      try {
        credentials = JSON.parse(app.jsonKey);
        if (!credentials.client_email || !credentials.private_key) {
          throw new Error(t("logs.errors.invalidCredentials"));
        }
      } catch (error) {
        const message = t("logs.errors.credentialsParseFailed") + ": " + (error instanceof Error ? error.message : t("logs.errors.unknown"));
        await log("error", message);
        throw new Error(message);
      }

      // 获取访问令牌
      const accessToken = await retryWithDelay(async () => {
        const token = await getAccessToken(credentials.client_email, credentials.private_key);
        if (!token) {
          throw new Error(t("logs.errors.tokenFailed"));
        }
        return token;
      });

      if (!isReconnection) {
        await log("info", t("logs.tokenObtained"));
      }

      // 验证站点访问权限
      const domain = app.domain.trim();
      const validSiteUrl = await retryWithDelay(async () => {
        return checkSiteUrl(accessToken, domain);
      });

      if (!isReconnection) {
        await log("info", t("logs.siteVerified", { url: validSiteUrl }));
      }

      // 获取要处理的 URLs
      let urls: string[] = [];

      if (rawUrls?.length > 0) {
        urls = rawUrls;
        if (!isReconnection) {
          await log("info", t("logs.urls_found", { count: urls.length }));
        }
      } else {
        if (!isReconnection) {
          await log("info", t("logs.fetchingSitemap"));
        }
        const [sitemaps, pages] = await retryWithDelay(async () => {
          return getSitemapPages(accessToken, validSiteUrl);
        });

        if (sitemaps.length === 0) {
          const message = t("logs.noSitemap");
          await log("error", message);
          throw new Error(message);
        }

        urls = pages;
        if (!isReconnection) {
          await log("info", t("logs.urls_found", { count: urls.length }));
        }
      }

      if (urls.length === 0) {
        const message = t("logs.noUrls");
        await log("info", message);
        // 直接返回结果，不抛出错误
        const stats = {
          total: 0,
          indexed: 0,
          submitted: 0,
          crawled: 0,
          error: 0,
          unknown: 0
        };

        // 保存空统计数据
        await prisma.batchStats.create({
          data: {
            batchId: requestState.batchId,
            appId,
            ...stats,
            timestamp: new Date(),
          },
        });

        await log("success", t("logs.completed"), undefined, undefined, {
          progress: 100,
          stats,
          isCompleted: true,
        });
        activeRequests.delete(requestId);
        return;
      }

      // 过滤掉已处理的 URLs
      const remainingUrls = urls.filter(url => !requestState!.processedUrls.has(url));

      // 如果所有 URL 都已处理完成，直接返回结果
      if (remainingUrls.length === 0) {
        const stats = getStats(requestState.urlStatuses);
        await log("success", t("logs.all_completed"), undefined, undefined, {
          progress: 100,
          stats,
          isCompleted: true,
        });
        activeRequests.delete(requestId);
        return;
      }

      // 处理剩余的 URLs
      await indexUrls(
        credentials.client_email,
        credentials.private_key,
        validSiteUrl,
        remainingUrls,
        sse,
        appId,
        async (type, message, url, status, data) => {
          // 更新处理进度
          if (url) {
            requestState!.processedUrls.add(url);
            if (status) {
              requestState!.urlStatuses.set(url, status as Status);
            }
          }

          // 更新进度
          if (data?.progress) {
            requestState!.lastProgress = data.progress;
          }

          await log(type, message, url, status, data);
        },
      );

      // 保存最终的统计数据
      const finalStats = getStats(requestState.urlStatuses);
      await prisma.batchStats.upsert({
        where: {
          batchId: requestState.batchId,
        },
        create: {
          batchId: requestState.batchId,
          appId,
          total: finalStats.total,
          indexed: finalStats.indexed,
          submitted: finalStats.submitted,
          crawled: finalStats.crawled,
          error: finalStats.error,
          unknown: finalStats.unknown,
          timestamp: new Date(),
        },
        update: {
          total: finalStats.total,
          indexed: finalStats.indexed,
          submitted: finalStats.submitted,
          crawled: finalStats.crawled,
          error: finalStats.error,
          unknown: finalStats.unknown,
          timestamp: new Date(),
        },
      });

      // 发送完成消息
      await log("success", t("logs.all_completed"), undefined, undefined, {
        progress: 100,
        stats: finalStats,
        isCompleted: true,
      });

      // 清理请求状态
      activeRequests.delete(requestId);

    } catch (error) {
      const message = error instanceof Error ? error.message : t("logs.errors.unknown");
      await log("error", message);

      // 如果是重连且未超过最大重试次数，则尝试重连
      if (isReconnection && requestState.retryCount < MAX_RETRIES) {
        requestState.retryCount++;
        await log("info", t("logs.retrying", { delay: RETRY_DELAY/1000, current: requestState.retryCount, max: MAX_RETRIES }));
        setTimeout(() => {
          handleIndexing(appId, rawUrls, saveLog, requestId);
        }, RETRY_DELAY);
        return;
      }

      throw error;
    }
  });
}

// 获取统计信息的辅助函数
function getStats(urlStatuses: Map<string, Status>) {
  return {
    total: urlStatuses.size,
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
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const appId = searchParams.get("appId");
    const rawUrls = searchParams.get("urls");
    const saveLog = searchParams.get("saveLog") === "true";
    const requestId = searchParams.get("requestId");

    // 从请求头或 URL 中获取语言设置
    const locale = searchParams.get("locale") ||
                  request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ||
                  defaultLocale;

    // 验证语言是否支持
    const finalLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
    // 设置系统语言
    I18nService.setSystemLocale(finalLocale as any);

    if (!appId || !requestId) {
      return new NextResponse(t("common.errors.missingParams"), { status: 400 });
    }

    // 验证应用所有权
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { userId: true },
    });

    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 403 });
    }

    return handleIndexing(
      appId,
      rawUrls ? JSON.parse(rawUrls) : [],
      saveLog,
      requestId
    );
  } catch (error) {
    console.error(t("common.errors.indexingRequestFailed"), error);
    return new NextResponse(error instanceof Error ? error.message : t("common.errors.unknown"), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, urls: rawUrls, saveLog = true, requestId } = body;

    // 从请求头或 URL 中获取语言设置
    const locale = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] || defaultLocale;
    // 验证语言是否支持
    const finalLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
    // 设置系统语言
    I18nService.setSystemLocale(finalLocale as any);

    if (!appId) {
      return NextResponse.json({ error: t("common.errors.missingAppId") }, { status: 400 });
    }

    if (!requestId) {
      return NextResponse.json({ error: t("common.errors.missingRequestId") }, { status: 400 });
    }

    return handleIndexing(appId, rawUrls, saveLog, requestId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("common.errors.unknown") },
      { status: error instanceof Error && error.message.includes(t("common.errors.notFound")) ? 404 : 500 },
    );
  }
}

export const dynamic = "force-dynamic";
