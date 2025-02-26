import { NextResponse } from "next/server";
import { t } from "@/i18n";

export type LogType = "info" | "error" | "success" | "progress" | "warning";

export interface LogMessage {
  type: LogType;
  message: string;
  data?: any;
  timestamp: string;
}

export class SSEHandler {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;
  private isClosed: boolean = false;
  private messages: LogMessage[] = [];
  private messageQueue: LogMessage[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
    this.startFlushInterval();
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushMessages();
    }, 100); // 每 100ms 刷新一次消息队列
  }

  private async flushMessages() {
    if (this.messageQueue.length === 0) return;

    const messages = this.messageQueue.splice(0);
    for (const message of messages) {
      try {
        const encodedMessage = this.encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
        this.controller.enqueue(encodedMessage);
        // 同时输出到服务端控制台，使用固定格式
        console.log(
          `[${new Date(message.timestamp).toLocaleTimeString()}] [${message.type.toUpperCase()}] ${
            message.message
          }${message.data ? ` ${JSON.stringify(message.data)}` : ""}`,
        );
      } catch (error) {
        console.error(t("common.errors.sseSendFailed"), error);
      }
    }
  }

  async send(type: LogType, message: string, data?: any) {
    if (this.isClosed) return;

    const event = {
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    try {
      // 只添加到消息队列，由 flushMessages 统一发送
      this.messages.push(event);
      this.messageQueue.push(event);
    } catch (error) {
      console.error(t("common.errors.sseSendFailed"), error);
    }
  }

  getMessages(): LogMessage[] {
    return this.messages;
  }

  async close() {
    if (this.isConnectionClosed()) return;

    try {
      this.isClosed = true;
      await this.flushMessages(); // 确保所有消息都被发送
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      this.controller.close();
    } catch (error) {
      console.error(t("common.errors.sseCloseFailed"), error);
    }
  }

  // 添加公共方法检查状态
  isConnectionClosed(): boolean {
    return this.isClosed;
  }
}

export function createSSEResponse(handler: (sse: SSEHandler) => Promise<void>): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const sse = new SSEHandler(controller);

      try {
        await handler(sse);
      } catch (error) {
        console.error(t("common.errors.sseHandlerFailed"), error);
        if (!sse.isConnectionClosed()) {
          await sse.send("error", error instanceof Error ? error.message : t("common.errors.unknown"));
          await sse.close();
        }
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      Connection: "keep-alive",
    },
  });
}
