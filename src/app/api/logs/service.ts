import { prisma } from "@/lib/prisma";
import { Status } from "@/shared/gsc/types";
import { LogType } from "@/lib/sse";

export interface CreateLogParams {
  batchId: string;
  appId: string;
  type: LogType;
  message: string;
  url?: string;
  status?: Status;
  timestamp: Date;
}

/**
 * 创建日志记录
 */
export async function createLog({ batchId, appId, type, message, url, status, timestamp }: CreateLogParams) {
  return prisma.indexLog.create({
    data: {
      batchId,
      appId,
      type,
      message,
      url: url || "",
      status: status?.toString() || "UNKNOWN",
      timestamp,
    },
  });
}

/**
 * 获取日志列表
 */
export async function getLogs({
  appId,
  batchId,
  limit = 100,
  offset = 0,
}: {
  appId: string;
  batchId?: string;
  limit?: number;
  offset?: number;
}) {
  // 获取批次列表
  const batches = await prisma.indexLog.groupBy({
    by: ["batchId"],
    where: {
      appId,
      ...(batchId ? { batchId } : {}),
      // 只统计有 URL 的日志
      url: {
        not: "",
      },
    },
    _count: {
      url: true,
    },
    orderBy: {
      _max: {
        timestamp: "desc",
      },
    },
    take: limit,
    skip: offset,
  });

  // 获取每个批次的详细信息
  const batchesWithDetails = await Promise.all(
    batches.map(async (batch) => {
      // 获取批次的第一条日志，用于获取时间戳
      const firstLog = await prisma.indexLog.findFirst({
        where: {
          batchId: batch.batchId,
          // 确保是有效的日志
          url: {
            not: "",
          },
        },
        orderBy: { timestamp: "asc" },
        select: { timestamp: true },
      });

      // 获取应用信息
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { domain: true },
      });

      // 统计各种状态的URL数量
      const statusCounts = {
        total: 0,
        indexed: 0,
        submitted: 0,
        crawled: 0,
        error: 0,
        unknown: 0,
      };

      // 获取批次的所有日志
      const logs = await prisma.indexLog.findMany({
        where: {
          batchId: batch.batchId,
          // 只查询有 URL 的日志
          url: {
            not: "",
          },
        },
        orderBy: { timestamp: "desc" },
        distinct: ["url"], // 每个URL只取最新的状态
      });

      // 计算总数（去重后的URL数量）
      statusCounts.total = logs.length;

      // 调试日志
      console.log(
        `批次 ${batch.batchId} 的日志:`,
        logs.map((log) => ({
          url: log.url,
          status: log.status,
        })),
      );

      // 统计每个URL的最终状态
      logs.forEach((log) => {
        const status = log.status.toUpperCase();
        switch (status) {
          case "SUCCESS":
            statusCounts.indexed++;
            break;
          case "PENDING":
            statusCounts.submitted++;
            break;
          case "FAILED":
            statusCounts.error++;
            break;
          case "CRAWLED_CURRENTLY_NOT_INDEXED":
            statusCounts.crawled++;
            break;
          case "URL_IS_UNKNOWN_TO_GOOGLE":
          case "DISCOVERED_CURRENTLY_NOT_INDEXED":
            statusCounts.unknown++;
            break;
          case "ERROR":
          case "FORBIDDEN":
          case "RATE_LIMITED":
            statusCounts.error++;
            break;
        }
      });

      // 调试日志
      console.log(`批次 ${batch.batchId} 的统计:`, statusCounts);

      return {
        batchId: batch.batchId,
        appId,
        domain: app?.domain || "",
        timestamp: firstLog?.timestamp || new Date(),
        stats: statusCounts,
      };
    }),
  );

  const total = await prisma.indexLog
    .groupBy({
      by: ["batchId"],
      where: {
        appId,
        // 只统计有 URL 的日志
        url: {
          not: "",
        },
      },
      _count: true,
    })
    .then((result) => result.length);

  return {
    batches: batchesWithDetails,
    total,
    limit,
    offset,
  };
}
