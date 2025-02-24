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

  // 先获取所有不同的 batchId
  const batchIds = await prisma.indexLog
    .groupBy({
      by: ["batchId"],
      where: {
        app: {
          userId: session.user.id,
        },
      },
      orderBy: {
        _max: {
          timestamp: "desc",
        },
      },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    })
    .then((groups) => groups.map((g) => g.batchId).filter((id): id is string => id !== null));

  // 获取总批次数
  const totalBatches = await prisma.indexLog
    .groupBy({
      by: ["batchId"],
      where: {
        app: {
          userId: session.user.id,
        },
      },
    })
    .then((groups) => groups.length);

  const totalPages = Math.ceil(totalBatches / PAGE_SIZE);

  // 获取这些批次的所有日志
  const batchLogs = (await prisma.indexLog.findMany({
    where: {
      batchId: {
        in: batchIds,
      },
    },
    include: {
      app: true,
    },
    orderBy: {
      timestamp: "desc",
    },
  })) as LogWithApp[];

  // 按批次 ID 分组
  const batchGroups = batchLogs.reduce(
    (acc, log) => {
      const batchId = log.batchId || "default";
      if (!acc[batchId]) {
        acc[batchId] = {
          batchId,
          appId: log.appId,
          appName: log.app.name,
          domain: log.app.domain,
          timestamp: log.timestamp,
          logs: [],
          stats: {
            total: 0,
            indexed: 0,
            submitted: 0,
            crawled: 0,
            error: 0,
            unknown: 0,
          },
        };
      }

      // 添加日志
      acc[batchId].logs.push({
        id: log.id,
        url: log.url,
        status: log.status as Status,
        message: log.message || "",
        type: log.type || "info",
        timestamp: log.timestamp,
      });

      return acc;
    },
    {} as Record<string, LogBatch>,
  );

  // 对每个批次进行状态统计
  Object.values(batchGroups).forEach((batch) => {
    // 按 URL 分组，只取每个 URL 的最新状态
    const urlLatestStatus = new Map<string, { status: Status; timestamp: Date }>();
    batch.logs
      .filter((log) => log.url) // 只统计有 URL 的日志
      .forEach((log) => {
        const existing = urlLatestStatus.get(log.url);
        if (!existing || log.timestamp > existing.timestamp) {
          urlLatestStatus.set(log.url, {
            status: log.status as Status,
            timestamp: log.timestamp,
          });
        }
      });

    // 重置统计
    batch.stats = {
      total: 0,
      indexed: 0,
      submitted: 0,
      crawled: 0,
      error: 0,
      unknown: 0,
    };

    // 统计每个 URL 的最终状态
    urlLatestStatus.forEach((data) => {
      batch.stats.total++;

      switch (data.status) {
        case "URL_IS_ON_GOOGLE":
          batch.stats.indexed++;
          break;
        case "PENDING":
          batch.stats.submitted++;
          break;
        case "CRAWLED_CURRENTLY_NOT_INDEXED":
          batch.stats.crawled++;
          break;
        case "ERROR":
        case "FORBIDDEN":
        case "RATE_LIMITED":
        case "FAILED":
          batch.stats.error++;
          break;
        case "URL_IS_UNKNOWN_TO_GOOGLE":
        case "DISCOVERED_CURRENTLY_NOT_INDEXED":
        default:
          batch.stats.unknown++;
          break;
      }
    });
  });

  // 对每个批次内的日志按时间升序排序
  Object.values(batchGroups).forEach((group: LogBatch) => {
    group.logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  });

  // 按时间戳降序排序批次
  const sortedBatches = Object.values(batchGroups)
    .map((batch) => ({
      ...batch,
      timestamp: batch.timestamp.toISOString(),
      logs: batch.logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
    }))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return <LogsClient logBatches={sortedBatches} currentPage={currentPage} totalPages={totalPages} />;
}
