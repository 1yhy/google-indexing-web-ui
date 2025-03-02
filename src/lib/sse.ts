import { NextResponse } from "next/server";
import { t } from "@/i18n";

export type LogType = "info" | "error" | "success" | "progress" | "warning" | "reconnect";

export interface ReconnectMessage {
  retryCount: number;
  maxRetries: number;
  delay: number;
}

export interface LogMessage {
  type: LogType;
  message: string;
  data?: any;
  timestamp: string;
  reconnect?: ReconnectMessage;
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
    }, 100); // flush message queue every 100ms
  }

  private async flushMessages() {
    if (this.messageQueue.length === 0) return;

    const messages = this.messageQueue.splice(0);
    for (const message of messages) {
      try {
        const encodedMessage = this.encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
        this.controller.enqueue(encodedMessage);
        // output to server console, using fixed format
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
      // only add to message queue, flushed by flushMessages
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
      await this.flushMessages(); // ensure all messages are sent
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      this.controller.close();
    } catch (error) {
      console.error(t("common.errors.sseCloseFailed"), error);
    }
  }

  // add public method to check status
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
