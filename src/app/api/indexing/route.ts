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
import { t } from "@/i18n";
import { DEFAULT_RECONNECTION_CONFIG, ReconnectionManager } from "@/lib/reconnection";

interface RequestState {
  batchId: string;
  processedUrls: Set<string>;
  urlStatuses: Map<string, Status>;
  isProcessing: boolean;
  lastProgress: number;
  startTime: number;
  reconnectionManager: ReconnectionManager;
}

const activeRequests = new Map<string, RequestState>();

// retry function
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  maxRetries: number = DEFAULT_RECONNECTION_CONFIG.maxRetries,
  delayMs: number = DEFAULT_RECONNECTION_CONFIG.retryDelay
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
  let requestState = activeRequests.get(requestId);
  const isReconnection = !!requestState;

  if (!requestState) {
    requestState = {
      batchId: crypto.randomUUID(),
      processedUrls: new Set(),
      urlStatuses: new Map(),
      isProcessing: false,
      lastProgress: 0,
      startTime: Date.now(),
      reconnectionManager: new ReconnectionManager()
    };
    activeRequests.set(requestId, requestState);
  }

  return createSSEResponse(async (sse) => {
    // create log function
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
      // if reconnection, send recovery message and current progress
      if (isReconnection) {
        await log("info", t("logs.reconnected"));
        await log("progress", t("logs.progress", { progress: requestState.lastProgress }), undefined, undefined, {
          progress: requestState.lastProgress,
          stats: getStats(requestState.urlStatuses),
        });
      }

      // get app info
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

      // parse JSON Key
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

      // get access token
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

      // verify site access permission
      const domain = app.domain.trim();
      const validSiteUrl = await retryWithDelay(async () => {
        return checkSiteUrl(accessToken, domain);
      });

      if (!isReconnection) {
        await log("info", t("logs.siteVerified", { url: validSiteUrl }));
      }

      // get urls to process
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
        // return result directly, do not throw error
        const stats = {
          total: 0,
          indexed: 0,
          submitted: 0,
          crawled: 0,
          error: 0,
          unknown: 0
        };

        // save empty stats
        await prisma.batchStats.create({
          data: {
            batchId: requestState.batchId,
            appId,
            ...stats,
            timestamp: new Date(),
          },
        });

        await log("success", t("logs.all_completed"), undefined, undefined, {
          progress: 100,
          stats,
          isCompleted: true,
        });
        activeRequests.delete(requestId);
        return;
      }

      // filter out processed urls
      const remainingUrls = urls.filter(url => !requestState!.processedUrls.has(url));

      // if all urls are processed, return result directly
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

      // process remaining urls
      await indexUrls(
        credentials.client_email,
        credentials.private_key,
        validSiteUrl,
        remainingUrls,
        sse,
        appId,
        async (type, message, url, status, data) => {
          // update processing progress
          if (url) {
            requestState!.processedUrls.add(url);
            if (status) {
              requestState!.urlStatuses.set(url, status as Status);
            }
          }

          // update progress
          if (data?.progress) {
            requestState!.lastProgress = data.progress;
          }

          await log(type, message, url, status, data);
        },
      );

      // save final stats
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

      // send completion message
      await log("success", t("logs.all_completed"), undefined, undefined, {
        progress: 100,
        stats: finalStats,
        isCompleted: true,
      });

      // clean up request state
      activeRequests.delete(requestId);

    } catch (error) {
      const message = error instanceof Error ? error.message : t("logs.errors.unknown");
      await log("error", message);

      if (requestState.reconnectionManager.canRetry()) {
        const delay = requestState.reconnectionManager.getNextDelay();
        const retryCount = requestState.reconnectionManager.incrementRetry();

        // 发送重连消息给前端
        await sse.send("reconnect", t("logs.retrying", {
          delay: delay/1000,
          current: retryCount,
          max: DEFAULT_RECONNECTION_CONFIG.maxRetries
        }), {
          retryCount,
          maxRetries: DEFAULT_RECONNECTION_CONFIG.maxRetries,
          delay
        });

        // 延迟重试
        setTimeout(() => {
          handleIndexing(appId, rawUrls, saveLog, requestId);
        }, delay);
        return;
      }

      // 超过重试次数，清理请求状态
      activeRequests.delete(requestId);
      throw error;
    }
  });
}

// helper function to get stats
function getStats(urlStatuses: Map<string, Status>) {
  return {
    total: urlStatuses.size,
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

    if (!appId || !requestId) {
      return new NextResponse(t("common.errors.missingParams"), { status: 400 });
    }

    // verify app ownership
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
