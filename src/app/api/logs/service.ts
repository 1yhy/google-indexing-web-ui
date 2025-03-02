import { prisma } from "@/lib/prisma";
import { Status } from "@/shared/gsc/types";
import { LogType } from "@/lib/sse";
import { t } from "@/i18n";

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
 * create log record
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
 * get log list
 */
export async function getLogs({
  userId,
  appId,
  batchId,
  limit = 100,
  offset = 0,
}: {
  userId: string;
  appId?: string;
  batchId?: string;
  limit?: number;
  offset?: number;
}) {
  // get all app ids of user
  const userAppIds = (await prisma.app.findMany({
    where: { userId },
    select: { id: true },
  })).map(app => app.id);

  if (userAppIds.length === 0) {
    return { batches: [], total: 0 };
  }

  // if appId is specified, verify permission
  if (appId && !userAppIds.includes(appId)) {
    throw new Error(t("common.errors.unauthorized"));
  }

  const targetAppIds = appId ? [appId] : userAppIds;

  // use subquery to get paginated batch ids
  const batchIdsQuery = await prisma.$queryRaw<{ batchId: string }[]>`
    WITH BatchTimestamps AS (
      SELECT "batchId", MAX("timestamp") as last_activity
      FROM "IndexLog"
      WHERE "appId" = ANY(${targetAppIds})
        AND "url" != ''
        AND "batchId" IS NOT NULL
      GROUP BY "batchId"
    )
    SELECT "batchId"
    FROM BatchTimestamps
    ORDER BY last_activity DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const batchIds = batchIdsQuery.map(b => b.batchId).filter(Boolean);

  // get all needed data
  const [batchesData, batchStats, totalBatches] = await Promise.all([
    // get batch basic info and logs
    prisma.indexLog.findMany({
      where: {
        batchId: { in: batchIds },
      },
      orderBy: { timestamp: "asc" },
      include: {
        app: {
          select: {
            domain: true,
            name: true,
          },
        },
      },
    }),
    // get batch stats
    prisma.batchStats.findMany({
      where: {
        batchId: { in: batchIds },
      },
    }),
    // get total batch count
    prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(DISTINCT "batchId") as count
      FROM "IndexLog"
      WHERE "appId" = ANY(${targetAppIds})
        AND "url" != ''
        AND "batchId" IS NOT NULL
    `,
  ]);

  // organize data by batch id
  const batchesMap = new Map();
  batchesData.forEach(log => {
    if (!batchesMap.has(log.batchId)) {
      batchesMap.set(log.batchId, {
        batchId: log.batchId,
        appId: log.appId,
        appName: log.app.name,
        domain: log.app.domain,
        timestamp: log.timestamp.toISOString(),
        logs: [],
        stats: {
          total: 0,
          indexed: 0,
          submitted: 0,
          crawled: 0,
          error: 0,
          unknown: 0,
        },
      });
    }
    batchesMap.get(log.batchId).logs.push({
      type: log.type,
      message: log.message || "",
      timestamp: log.timestamp.toISOString(),
    });
  });

  // add stats
  batchStats.forEach(stats => {
    if (batchesMap.has(stats.batchId)) {
      batchesMap.get(stats.batchId).stats = {
        total: stats.total,
        indexed: stats.indexed,
        submitted: stats.submitted,
        crawled: stats.crawled,
        error: stats.error,
        unknown: stats.unknown,
      };
    }
  });

  const total = Number(totalBatches[0]?.count || 0);

  // sort batches by time in descending order
  const batches = Array.from(batchesMap.values()).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return { batches, total };
}
