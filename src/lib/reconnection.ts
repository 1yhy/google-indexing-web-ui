export interface ReconnectionConfig {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 1.5
};

export class ReconnectionManager {
  private retryCount = 0;
  private config: ReconnectionConfig;

  constructor(config?: Partial<ReconnectionConfig>) {
    this.config = { ...DEFAULT_RECONNECTION_CONFIG, ...config };
  }

  canRetry(): boolean {
    return this.retryCount < this.config.maxRetries;
  }

  getNextDelay(): number {
    return this.config.retryDelay * Math.pow(this.config.backoffFactor, this.retryCount);
  }

  incrementRetry(): number {
    return ++this.retryCount;
  }

  reset(): void {
    this.retryCount = 0;
  }
}
