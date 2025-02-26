import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/shared/auth";
import { getSitemapPages } from "@/shared/sitemap";
import { convertToSiteUrl } from "@/shared/gsc";
import { t } from "@/i18n";

export async function POST(request: Request) {
  try {
    const { appId } = await request.json();

    if (!appId) {
      return NextResponse.json({ error: t("common.errors.missingAppId") }, { status: 400 });
    }

    // 获取应用信息
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app || !app.jsonKey || !app.domain) {
      return NextResponse.json({ error: t("logs.errors.appNotFound") }, { status: 404 });
    }

    // 解析 JSON Key
    let credentials;
    try {
      credentials = JSON.parse(app.jsonKey);
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error(t("logs.errors.invalidCredentials"));
      }
    } catch (error) {
      return NextResponse.json(
        { error: t("logs.errors.credentialsParseFailed") + ": " + (error instanceof Error ? error.message : t("logs.errors.unknown")) },
        { status: 400 },
      );
    }

    // 获取访问令牌
    const accessToken = await getAccessToken(credentials.client_email, credentials.private_key);
    if (!accessToken) {
      return NextResponse.json({ error: t("logs.errors.tokenFailed") }, { status: 401 });
    }

    // 获取 Sitemap URLs
    const domain = app.domain.trim();
    const siteUrl = convertToSiteUrl(domain);
    const [sitemaps, urls] = await getSitemapPages(accessToken, siteUrl);

    if (sitemaps.length === 0) {
      return NextResponse.json(
        { error: t("logs.noSitemap") },
        { status: 404 },
      );
    }

    return NextResponse.json({
      sitemaps,
      urls,
      total: urls.length,
    });
  } catch (error) {
    console.error(t("logs.errors.fetchSitemapUrlsFailed"), error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : t("logs.errors.fetchSitemapUrlsFailed") },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
