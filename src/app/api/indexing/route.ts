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

async function handleIndexing(appId: string, rawUrls: string[] = [], saveLog: boolean = true) {
  // 生成唯一的批次 ID
  const batchId = crypto.randomUUID();

  return createSSEResponse(async (sse) => {
    // 创建日志函数
    const log = async (type: LogType, message: string, url?: string, status?: string, data?: any) => {
      if (saveLog) {
        await createLog({
          batchId,
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
      // 获取应用信息
      const app = await prisma.app.findUnique({
        where: { id: appId },
      });

      if (!app || !app.jsonKey || !app.domain) {
        throw new Error("找不到应用或必要的配置信息");
      }

      await log("info", "开始处理...");

      // 解析 JSON Key
      let credentials;
      try {
        credentials = JSON.parse(app.jsonKey);
        if (!credentials.client_email || !credentials.private_key) {
          throw new Error("凭据信息不完整");
        }
      } catch (error) {
        const message = "解析凭据信息失败：" + (error instanceof Error ? error.message : "未知错误");
        await log("error", message);
        throw new Error(message);
      }

      // 获取访问令牌
      const accessToken = await getAccessToken(credentials.client_email, credentials.private_key);
      if (!accessToken) {
        const message = "获取访问令牌失败";
        await log("error", message);
        throw new Error(message);
      }
      await log("info", "已获取访问令牌");

      // 验证站点访问权限
      const domain = app.domain.trim();
      const validSiteUrl = await checkSiteUrl(accessToken, domain);
      await log("info", `已验证站点访问权限: ${validSiteUrl}`);

      // 获取要处理的 URLs
      let urls: string[] = [];

      if (rawUrls?.length > 0) {
        urls = rawUrls;
        await log("info", `📋 使用手动输入的 URLs: ${urls.length} 个`);
      } else {
        // 如果没有提供 URLs，尝试从 Sitemap 获取
        await log("info", "🗺️ 正在从 Sitemap 获取 URLs...");
        const [sitemaps, pages] = await getSitemapPages(accessToken, validSiteUrl);

        if (sitemaps.length === 0) {
          const message = "未找到任何 Sitemap，请先在 Google Search Console 中添加 Sitemap";
          await log("error", message);
          throw new Error(message);
        }

        urls = pages;
        await log("info", `📋 从 Sitemap 获取到 ${urls.length} 个 URLs`);
      }

      if (urls.length === 0) {
        const message = "没有找到任何需要处理的 URLs";
        await log("error", message);
        throw new Error(message);
      }

      // 处理 URLs
      await indexUrls(credentials.client_email, credentials.private_key, validSiteUrl, urls, sse, appId, log);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      await log("error", message);
      throw error;
    }
  });
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId");
    const urlsParam = searchParams.get("urls");
    const saveLog = searchParams.get("saveLog") === "true";

    if (!appId) {
      return NextResponse.json({ error: "缺少必要参数：appId" }, { status: 400 });
    }

    // 验证应用所有权
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { userId: true },
    });

    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: "无权访问此应用" }, { status: 403 });
    }

    const urls = urlsParam ? JSON.parse(urlsParam) : [];
    return handleIndexing(appId, urls, saveLog);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "未知错误" },
      { status: error instanceof Error && error.message.includes("找不到") ? 404 : 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, urls: rawUrls, saveLog = true } = body;

    if (!appId) {
      return NextResponse.json({ error: "缺少必要参数：appId" }, { status: 400 });
    }

    return handleIndexing(appId, rawUrls, saveLog);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "未知错误" },
      { status: error instanceof Error && error.message.includes("找不到") ? 404 : 500 },
    );
  }
}

export const dynamic = "force-dynamic";
