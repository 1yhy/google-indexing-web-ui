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
          <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs md:text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LogBatchCard({ batch, onViewDetails }: { batch: LogBatch; onViewDetails: (batch: LogBatch) => void }) {
  const t = useTranslations();
  const formatDate = (dateStr: string) => {
    return DateTimeFormatter.format(dateStr);
  };

  return (
    <div className="p-4 space-y-3 bg-white rounded-lg border shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-gray-900">{batch.domain}</div>
          <div className="mt-1 text-xs text-gray-500">{formatDate(batch.timestamp)}</div>
          <div className="mt-1 font-mono text-xs text-gray-500">ID: {batch.batchId.slice(-8)}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(batch)}
          className="text-xs"
        >
          {t("logs.viewDetails")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{t("logs.status.total")}</span>
            <span className="font-medium text-gray-900">{batch.stats.total}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{t("logs.status.indexed")}</span>
            <span className="font-medium text-green-600">{batch.stats.indexed}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{t("logs.status.submitted")}</span>
            <span className="font-medium text-yellow-600">{batch.stats.submitted}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{t("logs.status.error")}</span>
            <span className="font-medium text-red-600">{batch.stats.error}</span>
          </div>
        </div>
      </div>
    </div>
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
    <div className="py-4 md:py-6">
      {/* top navigation */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center">
          <Link href="/indexing" className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Link>
          <h1 className="ml-2 text-lg font-semibold text-gray-900 md:ml-4 md:text-xl">{t("logs.title")}</h1>
        </div>
      </div>

      {/* Mobile View */}
      <div className="block space-y-4 md:hidden">
        {logBatches.length === 0 ? (
          <div className="py-4 text-sm text-center text-gray-500">
            {t("common.noData")}
          </div>
        ) : (
          logBatches.map((batch) => (
            <LogBatchCard
              key={batch.batchId}
              batch={batch}
              onViewDetails={setSelectedBatch}
            />
          ))
        )}
      </div>

      {/* PC View */}
      <div className="hidden overflow-x-auto relative md:block">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-lg border shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.batchId")} description={t("logs.batchIdDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    {t("apps.domain")}
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    {t("logs.submitTime")}
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.status.total")} description={t("logs.totalDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.status.indexed")} description={t("logs.indexedDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.status.submitted")} description={t("logs.submittedDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.status.crawled")} description={t("logs.crawledDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    <StatusHeader title={t("logs.status.error")} description={t("logs.errorDesc")} />
                  </th>
                  <th className="px-2 py-2 text-xs font-medium tracking-wider text-center text-gray-500 uppercase whitespace-nowrap md:px-3 md:py-3">
                    {t("apps.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-2 py-3 text-xs text-center text-gray-500 md:px-3 md:py-4 md:text-sm">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  logBatches.map((batch) => (
                    <tr key={batch.batchId} className="hover:bg-gray-50">
                      <td className="px-2 py-3 font-mono text-xs text-gray-500 md:px-3 md:py-4 md:text-sm">{batch.batchId.slice(-8)}</td>
                      <td className="px-2 py-3 text-xs text-gray-900 md:px-3 md:py-4 md:text-sm">{batch.domain}</td>
                      <td className="px-2 py-3 text-xs text-gray-500 whitespace-nowrap md:px-3 md:py-4 md:text-sm">{formatDate(batch.timestamp)}</td>
                      <td className="px-2 py-3 text-xs text-center text-gray-900 md:px-3 md:py-4 md:text-sm">{batch.stats.total}</td>
                      <td className="px-2 py-3 text-xs text-center text-green-600 md:px-3 md:py-4 md:text-sm">{batch.stats.indexed}</td>
                      <td className="px-2 py-3 text-xs text-center text-yellow-600 md:px-3 md:py-4 md:text-sm">{batch.stats.submitted}</td>
                      <td className="px-2 py-3 text-xs text-center text-blue-600 md:px-3 md:py-4 md:text-sm">{batch.stats.crawled}</td>
                      <td className="px-2 py-3 text-xs text-center text-red-600 md:px-3 md:py-4 md:text-sm">{batch.stats.error}</td>
                      <td className="px-2 py-3 text-xs text-center md:px-3 md:py-4 md:text-sm">
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
        </div>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-2 text-xs md:text-sm md:px-3"
          >
            {t("common.prevPage")}
          </Button>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-600 md:text-sm">
              {t("common.pageInfo", { current: currentPage, total: totalPages })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-2 text-xs md:text-sm md:px-3"
          >
            {t("common.nextPage")}
          </Button>
        </div>
      )}

      {/* log details dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="w-[95vw] max-h-[65vh] h-full p-4 flex flex-col overflow-y-auto overflow-x-hidden max-w-4xl md:p-6">
          <DialogHeader className="w-full">
            <DialogTitle className="text-base md:text-lg">
              {selectedBatch?.domain} - {selectedBatch && formatDate(selectedBatch.timestamp)}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden flex-1 mt-4 w-full h-full">
            <Terminal height="h-full md:h-[500px]" logs={selectedBatch?.logs || []} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
