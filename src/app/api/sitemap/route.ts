import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/shared/auth";
import { getSitemapPages } from "@/shared/sitemap";
import { convertToSiteUrl } from "@/shared/gsc";

export async function POST(request: Request) {
  try {
    const { appId } = await request.json();

    if (!appId) {
      return NextResponse.json({ error: "缺少必要参数：appId" }, { status: 400 });
    }

    // 获取应用信息
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || !app.jsonKey || !app.domain) {
      return NextResponse.json({ error: "找不到应用或必要的配置信息" }, { status: 404 });
    }

    // 解析 JSON Key
    let credentials;
    try {
      credentials = JSON.parse(app.jsonKey);
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error("凭据信息不完整");
      }
    } catch (error) {
      return NextResponse.json(
        { error: "解析凭据信息失败：" + (error instanceof Error ? error.message : "未知错误") },
        { status: 400 },
      );
    }

    // 获取访问令牌
    const accessToken = await getAccessToken(credentials.client_email, credentials.private_key);
    if (!accessToken) {
      return NextResponse.json({ error: "获取访问令牌失败" }, { status: 401 });
    }

    // 获取 Sitemap URLs
    const domain = app.domain.trim();
    const siteUrl = convertToSiteUrl(domain);
    const [sitemaps, urls] = await getSitemapPages(accessToken, siteUrl);

    if (sitemaps.length === 0) {
      return NextResponse.json(
        { error: "未找到任何 Sitemap，请先在 Google Search Console 中添加 Sitemap" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      sitemaps,
      urls,
      total: urls.length,
    });
  } catch (error) {
    console.error("获取 Sitemap URLs 失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取 Sitemap URLs 失败" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
