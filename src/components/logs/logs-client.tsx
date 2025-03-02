"use client";

import { useState } from "react";
import { Terminal } from "@/components/ui/terminal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n";
import { useRouter } from "next/navigation";
import { DateTimeFormatter } from "@/lib/date";

interface LogEntry {
  type: string;
  message: string;
  timestamp: string;
}

interface LogBatch {
  batchId: string;
  appId: string;
  appName: string;
  domain: string;
  timestamp: string;
  logs: LogEntry[];
  stats: {
    total: number;
    indexed: number;
    submitted: number;
    crawled: number;
    error: number;
    unknown: number;
  };
}

interface LogsClientProps {
  logBatches: LogBatch[];
  currentPage: number;
  totalPages: number;
}

function StatusHeader({ title, description }: { title: string; description: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="flex gap-1 items-center">
          {title}
          <HelpCircle className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function LogsClient({ logBatches, currentPage, totalPages }: LogsClientProps) {
  const [selectedBatch, setSelectedBatch] = useState<LogBatch | null>(null);
  const router = useRouter();
  const t = useTranslations();

  const handlePageChange = (page: number) => {
    router.push(`/logs?page=${page}`);
  };

  const formatDate = (dateStr: string) => {
    return DateTimeFormatter.format(dateStr);
  };

  return (
    <div className="p-6">
      {/* top navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/indexing" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="ml-4 text-xl font-semibold text-gray-900">{t("logs.title")}</h1>
        </div>
      </div>

      {/* log batch table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.batchId")} description={t("logs.batchIdDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap">
                {t("apps.domain")}
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap">
                {t("logs.submitTime")}
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.status.total")} description={t("logs.totalDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.status.indexed")} description={t("logs.indexedDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.status.submitted")} description={t("logs.submittedDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.status.crawled")} description={t("logs.crawledDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                <StatusHeader title={t("logs.status.error")} description={t("logs.errorDesc")} />
              </th>
              <th className="px-3 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap">
                {t("apps.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logBatches.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-sm text-center text-gray-500">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              logBatches.map((batch) => (
                <tr key={batch.batchId} className="hover:bg-gray-50">
                  <td className="px-3 py-4 font-mono text-sm text-gray-500">{batch.batchId.slice(-8)}</td>
                  <td className="px-3 py-4 text-sm text-gray-900">{batch.domain}</td>
                  <td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(batch.timestamp)}</td>
                  <td className="px-3 py-4 text-sm text-center text-gray-900">{batch.stats.total}</td>
                  <td className="px-3 py-4 text-sm text-center text-green-600">{batch.stats.indexed}</td>
                  <td className="px-3 py-4 text-sm text-center text-yellow-600">{batch.stats.submitted}</td>
                  <td className="px-3 py-4 text-sm text-center text-blue-600">{batch.stats.crawled}</td>
                  <td className="px-3 py-4 text-sm text-center text-red-600">{batch.stats.error}</td>
                  <td className="px-3 py-4 text-sm text-center">
                    <button
                      onClick={() => setSelectedBatch(batch)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {t("logs.viewDetails")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            {t("common.prevPage")}
          </Button>
          <div className="flex gap-1 items-center">
            <span className="text-sm text-gray-600">
              {t("common.pageInfo", { current: currentPage, total: totalPages })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            {t("common.nextPage")}
          </Button>
        </div>
      )}

      {/* log details dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBatch?.domain} - {selectedBatch && formatDate(selectedBatch.timestamp)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Terminal height="h-[500px]" logs={selectedBatch?.logs || []} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
