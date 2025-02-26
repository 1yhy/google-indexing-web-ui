"use client";

import { useState } from "react";
import { Terminal } from "@/components/ui/terminal";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
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
  const locale = useLocale();
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!selectedAppId) {
        toast.error(t("indexing.errors.selectApp"));
        throw new Error(t("indexing.errors.selectApp"));
      }

      // 防止重复提交
      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setProgress(0);
      setStats({
        total: 0,
        indexed: 0,
        submitted: 0,
        crawled: 0,
        error: 0,
        unknown: 0,
      });
      setLogs([]);

      // 如果用户手动输入了 URLs，使用用户输入的；否则系统会自动从 Sitemap 获取
      const urlList = urls
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url);

      if (urlList.length > 0) {
        // 验证 URL 格式
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

        // 设置总数
        setStats((prev) => ({ ...prev, total: urlList.length }));
      }

      // 生成唯一的请求 ID
      const requestId = crypto.randomUUID();

      // 创建 EventSource 连接
      const eventSource = new EventSource(
        `/api/indexing?${new URLSearchParams({
          appId: selectedAppId,
          urls: urlList.length > 0 ? JSON.stringify(urlList) : "",
          saveLog: saveLog.toString(),
          requestId,
          locale,
        })}`,
      );

      // 处理消息
      let isCompleted = false;
      let reconnectCount = 0;
      const MAX_RECONNECTS = 3;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // 如果已经标记完成，不再处理新消息
          if (isCompleted) {
            eventSource.close();
            return;
          }

          setLogs((prev) => [
            ...prev,
            {
              ...data,
              timestamp: new Date().toISOString(),
            },
          ]);

          // 更新进度
          if (data.data?.progress) {
            const currentProgress = Math.round(data.data.progress);
            setProgress(currentProgress);
          }

          // 更新统计信息
          if (data.data?.stats) {
            setStats(data.data.stats);
          }

          // 如果后端标记完成，则更新状态并关闭连接
          if (data.data?.isCompleted) {
            isCompleted = true;
            setIsLoading(false);
            eventSource.close();
          }
        } catch (error) {
          console.error("处理 SSE 消息时发生错误:", error);
          setIsLoading(false);
          eventSource.close();
        }
      };

      // 处理错误和重连
      eventSource.onerror = (error) => {
        // 如果已经完成，则是正常结束
        if (isCompleted) {
          return;
        }

        // 检查连接状态
        if (eventSource.readyState === EventSource.CLOSED) {
          reconnectCount++;
          console.log(`SSE 连接断开，重试次数: ${reconnectCount}/${MAX_RECONNECTS}`);

          // 如果超过最大重试次数，则停止重试
          if (reconnectCount >= MAX_RECONNECTS) {
            console.error("SSE 连接失败，超过最大重试次数");
            setIsLoading(false);
            toast.error(t("indexing.errors.sseError"));
            eventSource.close();
          }
        }
      };

      // 处理重连
      eventSource.onopen = () => {
        if (reconnectCount > 0) {
          console.log("SSE 连接已重新建立");
        }
      };

      // 组件卸载时清理
      return () => {
        if (!isCompleted && eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
        }
        setIsLoading(false);
      };
    } catch (error) {
      setIsLoading(false);
      setLogs((prev) => [
        ...prev,
        {
          type: "error",
          message: error instanceof Error ? error.message : t("indexing.errors.submitFailed"),
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }

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
