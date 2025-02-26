"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";
import { useFormatter } from "next-intl";

interface LogEntry {
  type: string;
  message: string;
  timestamp: string;
}

interface TerminalProps extends React.HTMLAttributes<HTMLDivElement> {
  logs: LogEntry[];
  height?: string;
}

export function Terminal({ logs, height = "h-[300px]", className, ...props }: TerminalProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const format = useFormatter();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-400";
      case "info":
        return "text-blue-400";
      default:
        return "text-gray-400";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format.dateTime(new Date(timestamp), {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className={cn("rounded-md border bg-zinc-950", className)} {...props}>
      <ScrollArea className={height}>
        <div className="p-4 font-mono text-xs leading-relaxed">
          {logs.map((log, index) => {
            const color = getLogColor(log.type);
            const time = formatTimestamp(log.timestamp);

            return (
              <div key={index} className="space-y-1">
                <div className="flex items-start space-x-2">
                  <span className={color}>[{time}]</span>
                  <span className={color}>{log.message}</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
