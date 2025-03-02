import { NextRequest, NextResponse } from "next/server";
import { createLog, CreateLogParams, getLogs } from "./service";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { t } from "@/i18n";

/**
 * create log record
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
 * get log list
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: t("common.errors.unauthorized") }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appId = searchParams.get("appId") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 获取日志数据
    const result = await getLogs({
      userId: session.user.id,
      appId,
      batchId,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(t("logs.errors.getFailed"), error);
    return NextResponse.json({ error: error instanceof Error ? error.message : t("logs.errors.getFailed") }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
