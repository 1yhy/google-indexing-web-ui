import { prisma } from "@/lib/prisma";
import LogsClient from "@/components/logs/logs-client";
import { Status } from "@/shared";
import { IndexLog, App } from "@prisma/client";
import { auth } from "@/auth";
import { unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n";
import { notFound } from "next/navigation";

const PAGE_SIZE = 10;

interface LogBatch {
  batchId: string;
  appId: string;
  appName: string;
  domain: string;
  timestamp: Date;
  logs: Array<{
    id: string;
    url: string;
    status: Status;
    message: string;
    type: string;
    timestamp: Date;
  }>;
  stats: {
    total: number;
    indexed: number;
    submitted: number;
    crawled: number;
    error: number;
    unknown: number;
  };
}

type LogWithApp = IndexLog & {
  app: App;
};

interface LogsPageProps {
  params: {
    locale: string;
  };
  searchParams: {
    page?: string;
  };
}

export default async function LogsPage({ params: { locale }, searchParams }: LogsPageProps) {
  // 验证语言参数
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // 启用服务器端国际化
  unstable_setRequestLocale(locale);

  const session = await auth();
  const currentPage = Number(searchParams.page) || 1;

  if (!session?.user) {
    return <LogsClient logBatches={[]} currentPage={1} totalPages={0} />;
  }

  // 获取批次列表（按时间倒序）
  const batches = await prisma.indexLog.groupBy({
    by: ["batchId"],
    where: {
      appId: {
        in: (await prisma.app.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        })).map(app => app.id),
      },
      url: { not: "" },
    },
    _count: {
      url: true,
    },
    orderBy: {
      _max: {
        timestamp: "desc",
      },
    },
    take: PAGE_SIZE,
    skip: (currentPage - 1) * PAGE_SIZE,
  });

  // 获取每个批次的详细信息
  const batchesWithDetails = await Promise.all(
    batches.map(async (batch) => {
      // 获取批次的统计数据
      const stats = batch.batchId ? await prisma.batchStats.findUnique({
        where: { batchId: batch.batchId },
      }) : null;

      // 获取批次的第一条日志（用于时间戳和应用信息）
      const firstLog = await prisma.indexLog.findFirst({
        where: {
          batchId: batch.batchId,
          url: { not: "" },
        },
        orderBy: { timestamp: "asc" },
        include: {
          app: {
            select: {
              domain: true,
              name: true
            },
          },
        },
      });

      // 获取批次的所有日志
      const logs = await prisma.indexLog.findMany({
        where: {
          batchId: batch.batchId,
        },
        orderBy: { timestamp: "asc" },
      });

      return {
        batchId: batch.batchId || "",
        appId: firstLog?.appId || "",
        appName: firstLog?.app?.name || "",
        domain: firstLog?.app?.domain || "",
        timestamp: firstLog?.timestamp.toISOString() || new Date().toISOString(),
        stats: stats ? {
          total: stats.total,
          indexed: stats.indexed,
          submitted: stats.submitted,
          crawled: stats.crawled,
          error: stats.error,
          unknown: stats.unknown,
        } : {
          total: 0,
          indexed: 0,
          submitted: 0,
          crawled: 0,
          error: 0,
          unknown: 0,
        },
        logs: logs.map(log => ({
          id: log.id,
          url: log.url || "",
          status: log.status as Status,
          type: log.type,
          message: log.message || "",
          timestamp: log.timestamp.toISOString(),
        })),
      };
    }),
  );

  // 获取总批次数
  const total = await prisma.indexLog.groupBy({
    by: ["batchId"],
    where: {
      appId: {
        in: (await prisma.app.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        })).map(app => app.id),
      },
      url: { not: "" },
    },
    _count: true,
  }).then(result => result.length);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return <LogsClient logBatches={batchesWithDetails} currentPage={currentPage} totalPages={totalPages} />;
}
