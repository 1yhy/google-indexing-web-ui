import { prisma } from "@/lib/prisma";
import LogsClient from "@/components/logs/logs-client";
import { Status } from "@/shared";
import { auth } from "@/auth";
import { unstable_setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n";
import { notFound } from "next/navigation";

const PAGE_SIZE = 10;

interface LogsPageProps {
  params: {
    locale: string;
  };
  searchParams: {
    page?: string;
  };
}

export default async function LogsPage({ params: { locale }, searchParams }: LogsPageProps) {
  // verify language parameter
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // enable server-side internationalization
  unstable_setRequestLocale(locale);

  const session = await auth();
  const currentPage = Number(searchParams.page) || 1;

  if (!session?.user) {
    return <LogsClient logBatches={[]} currentPage={1} totalPages={0} />;
  }

  // get all app ids of user
  const userAppIds = (await prisma.app.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  })).map(app => app.id);

  // use subquery to get batch ids of pagination
  const batchIdsQuery = await prisma.$queryRaw<{ batchId: string }[]>`
    WITH BatchTimestamps AS (
      SELECT "batchId", MAX("timestamp") as last_activity
      FROM "IndexLog"
      WHERE "appId" = ANY(${userAppIds})
        AND "url" != ''
      GROUP BY "batchId"
    )
    SELECT "batchId"
    FROM BatchTimestamps
    ORDER BY last_activity DESC
    LIMIT ${PAGE_SIZE}
    OFFSET ${(currentPage - 1) * PAGE_SIZE}
  `;

  const batchIds = batchIdsQuery.map(b => b.batchId).filter(Boolean);

  // get all data needed at once
  const [batchesData, batchStats] = await Promise.all([
    // get basic info and logs of batch
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
    // get stats of batch
    prisma.batchStats.findMany({
      where: {
        batchId: { in: batchIds },
      },
    }),
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
      id: log.id,
      url: log.url || "",
      status: log.status as Status,
      type: log.type,
      message: log.message || "",
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

  // get total batches (use more efficient count query)
  const totalBatches = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(DISTINCT "batchId") as count
    FROM "IndexLog"
    WHERE "appId" = ANY(${userAppIds})
      AND "url" != ''
      AND "batchId" IS NOT NULL
  `;

  const total = Number(totalBatches[0]?.count || 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // sort batches by time in descending order
  const batchesWithDetails = Array.from(batchesMap.values()).sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return <LogsClient logBatches={batchesWithDetails} currentPage={currentPage} totalPages={totalPages} />;
}
