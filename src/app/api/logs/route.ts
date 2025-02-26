import { NextRequest, NextResponse } from "next/server";
import { createLog, CreateLogParams, getLogs } from "./service";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { t } from "@/i18n";

/**
 * 创建日志记录
 */
export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as CreateLogParams;
    const log = await createLog(data);
    return NextResponse.json(log);
  } catch (error) {
    console.error(t("logs.errors.createFailed"), error);
    return NextResponse.json({ error: error instanceof Error ? error.message : t("logs.errors.createFailed") }, { status: 500 });
  }
}

/**
 * 获取日志列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId");
    const batchId = searchParams.get("batchId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!appId) {
      return NextResponse.json({ error: t("common.errors.missingAppId") }, { status: 400 });
    }

    // 验证应用所有权
    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: { userId: true },
    });

    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 403 });
    }

    const result = await getLogs({ appId, batchId, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error(t("logs.errors.getFailed"), error);
    return NextResponse.json({ error: error instanceof Error ? error.message : t("logs.errors.getFailed") }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
