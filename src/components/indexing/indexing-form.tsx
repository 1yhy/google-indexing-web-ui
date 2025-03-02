"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal } from "@/components/ui/terminal";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n";

interface Props {
  apps: Array<{
    id: string;
    name: string;
    domain: string;
  }>;
}

interface Stats {
  total: number;
  indexed: number;
  submitted: number;
  crawled: number;
  error: number;
  unknown: number;
}

interface Log {
  type: string;
  message: string;
  url?: string;
  status?: string;
  timestamp: string;
}

export function IndexingForm({ apps }: Props) {
  const t = useTranslations();
  const [selectedAppId, setSelectedAppId] = useState(apps[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    indexed: 0,
    submitted: 0,
    crawled: 0,
    error: 0,
    unknown: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [urls, setUrls] = useState("");
  const [saveLog, setSaveLog] = useState(true);
  const [currentRequestId, setCurrentRequestId] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);

  // 清理函数
  const cleanup = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  // 创建新的 SSE 连接
  const createEventSource = (requestId: string) => {
    cleanup();

    const eventSource = new EventSource(
      `/api/indexing?${new URLSearchParams({
        appId: selectedAppId,
        urls: urls.length > 0 ? JSON.stringify(urls) : "",
        saveLog: saveLog.toString(),
        requestId,
      })}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // handle reconnect message
        if (data.type === "reconnect") {
          toast.info(data.message);
          return;
        }

        // update logs
        setLogs((prev) => [...prev, { ...data }]);

        // update progress
        if (data.data.progress) {
          const currentProgress = Math.round(data.data.progress);
          setProgress(currentProgress);
        }

        // update stats
        if (data.data.stats) {
          setStats(data.data.stats);
        }

        // handle completion
        if (data.data.isCompleted) {
          setIsLoading(false);
          cleanup();
        }
      } catch (error) {
        console.error("Error processing SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);

      // if connection closed and still loading, show error toast
      if (eventSource.readyState === EventSource.CLOSED && isLoading) {
        toast.error(t("common.errors.connectionLost"));
      }
    };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProgress(0);
    setLogs([]);
    setStats({
      total: 0,
      indexed: 0,
      submitted: 0,
      crawled: 0,
      error: 0,
      unknown: 0,
    });

    try {
      if (!selectedAppId) {
        toast.error(t("indexing.errors.selectApp"));
        throw new Error(t("indexing.errors.selectApp"));
      }

      // if user manually inputs URLs, use user input; otherwise, the system will automatically get from Sitemap
      const urlList = urls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url);

      if (urlList.length > 0) {
        // verify URL format
        const invalidUrls = urlList.filter((url) => {
          try {
            const parsedUrl = new URL(url);
            return !parsedUrl.protocol.startsWith("http");
          } catch {
            return true;
          }
        });

        if (invalidUrls.length > 0) {
          const errorMessage = t("indexing.errors.invalidUrls", { urls: invalidUrls.join("\n") });
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }

        // set total
        setStats((prev) => ({ ...prev, total: urlList.length }));
      }

      // generate new request ID
      const requestId = crypto.randomUUID();
      setCurrentRequestId(requestId);

      // create SSE connection
      createEventSource(requestId);

    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : t("common.errors.unknown"));
      setIsLoading(false);
      cleanup();
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="app">{t("indexing.selectApp")}</Label>
        <Select value={selectedAppId} onValueChange={setSelectedAppId}>
          <SelectTrigger id="app">
            <SelectValue placeholder={t("indexing.selectAppPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {apps.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {app.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="urls">{t("indexing.enterUrls")}</Label>
        <Textarea
          id="urls"
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={t("indexing.urlsPlaceholder")}
          className="h-40 font-mono"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="saveLog" checked={saveLog} onCheckedChange={(checked) => setSaveLog(checked as boolean)} />
        <div className="flex items-center space-x-2">
          <Label htmlFor="saveLog" className="cursor-pointer">
            {t("indexing.saveLog")}
          </Label>
          <Link href="/logs" className="text-sm text-blue-600 hover:underline">
            {t("indexing.viewHistory")}
          </Link>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
        {isLoading ? t("indexing.processing") : t("indexing.submit")}
      </Button>

      {logs.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t("indexing.processLogs")}</h3>
            {isLoading && (
              <div className="flex items-center space-x-4">
                <Progress value={progress} className="w-40" />
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
            )}
          </div>

          <Terminal logs={logs} height="h-[350px]" />

          {stats.total > 0 && (
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">
                {t("indexing.stats.indexed")}: {stats.indexed}
              </span>
              <span className="text-yellow-600">
                {t("indexing.stats.submitted")}: {stats.submitted}
              </span>
              <span className="text-blue-600">
                {t("indexing.stats.crawled")}: {stats.crawled}
              </span>
              <span className="text-gray-600">
                {t("indexing.stats.unknown")}: {stats.unknown}
              </span>
              <span className="text-gray-600">
                {t("indexing.stats.total")}: {stats.total}
              </span>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
