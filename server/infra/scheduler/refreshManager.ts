import { logger } from "../logging/logger";
import { TTLPolicy, DEFAULT_TTL_POLICY, DataType, isStale, formatTTL } from "./ttlPolicy";

interface RefreshTask {
  symbol: string;
  dataType: DataType;
  lastRefresh: number;
  inProgress: boolean;
  scheduledAt: number | null;
}

interface RefreshResult {
  symbol: string;
  dataType: DataType;
  success: boolean;
  duration: number;
  error?: string;
}

type RefreshHandler = (symbol: string, dataType: DataType) => Promise<void>;

class RefreshManager {
  private tasks: Map<string, RefreshTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private handler: RefreshHandler | null = null;
  private policy: TTLPolicy = DEFAULT_TTL_POLICY;
  private isRunning = false;

  private getTaskKey(symbol: string, dataType: DataType): string {
    return `${symbol}:${dataType}`;
  }

  setPolicy(policy: Partial<TTLPolicy>): void {
    this.policy = { ...this.policy, ...policy };
    logger.scheduler("TTL policy updated", { policy: this.policy });
  }

  setHandler(handler: RefreshHandler): void {
    this.handler = handler;
  }

  registerSymbol(symbol: string, dataTypes: DataType[] = ["price", "technicals", "sentiment", "options"]): void {
    for (const dataType of dataTypes) {
      const key = this.getTaskKey(symbol, dataType);
      if (!this.tasks.has(key)) {
        this.tasks.set(key, {
          symbol,
          dataType,
          lastRefresh: 0,
          inProgress: false,
          scheduledAt: null,
        });
      }
    }
    logger.withContext({ symbol }).scheduler("Symbol registered for refresh", { dataTypes });
  }

  unregisterSymbol(symbol: string): void {
    const entries = Array.from(this.tasks.entries());
    for (const [key, task] of entries) {
      if (task.symbol === symbol) {
        this.cancelScheduled(key);
        this.tasks.delete(key);
      }
    }
    logger.withContext({ symbol }).scheduler("Symbol unregistered");
  }

  recordRefresh(symbol: string, dataType: DataType): void {
    const key = this.getTaskKey(symbol, dataType);
    const task = this.tasks.get(key);
    if (task) {
      task.lastRefresh = Date.now();
      task.inProgress = false;
    }
  }

  needsRefresh(symbol: string, dataType: DataType): boolean {
    const key = this.getTaskKey(symbol, dataType);
    const task = this.tasks.get(key);
    
    if (!task) return true;
    if (task.inProgress) return false;
    
    return isStale(task.lastRefresh, dataType, this.policy);
  }

  async refreshIfNeeded(symbol: string, dataType: DataType): Promise<RefreshResult | null> {
    if (!this.needsRefresh(symbol, dataType)) {
      return null;
    }

    const key = this.getTaskKey(symbol, dataType);
    let task = this.tasks.get(key);
    
    if (!task) {
      this.registerSymbol(symbol, [dataType]);
      task = this.tasks.get(key)!;
    }

    if (task.inProgress) {
      logger.withContext({ symbol }).scheduler(`Refresh already in progress for ${dataType}`);
      return null;
    }

    task.inProgress = true;
    const startTime = Date.now();
    const log = logger.withContext({ symbol });

    try {
      if (this.handler) {
        await this.handler(symbol, dataType);
      }
      
      task.lastRefresh = Date.now();
      task.inProgress = false;
      
      const duration = Date.now() - startTime;
      log.scheduler(`Refreshed ${dataType}`, { durationMs: duration });
      
      return {
        symbol,
        dataType,
        success: true,
        duration,
      };
    } catch (error) {
      task.inProgress = false;
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      
      log.error("SCHEDULER", `Failed to refresh ${dataType}: ${errorMsg}`, {
        durationMs: duration,
        error: errorMsg,
      });
      
      return {
        symbol,
        dataType,
        success: false,
        duration,
        error: errorMsg,
      };
    }
  }

  private scheduleNext(key: string, delayMs: number): void {
    this.cancelScheduled(key);
    
    const timer = setTimeout(async () => {
      const task = this.tasks.get(key);
      if (task && this.isRunning) {
        await this.refreshIfNeeded(task.symbol, task.dataType);
        this.scheduleNext(key, this.policy[task.dataType]);
      }
    }, delayMs);
    
    this.timers.set(key, timer);
    
    const task = this.tasks.get(key);
    if (task) {
      task.scheduledAt = Date.now() + delayMs;
    }
  }

  private cancelScheduled(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const entries = Array.from(this.tasks.entries());
    for (const [key, task] of entries) {
      const ttl = this.policy[task.dataType];
      const elapsed = Date.now() - task.lastRefresh;
      const delay = Math.max(0, ttl - elapsed);
      
      this.scheduleNext(key, delay);
    }
    
    logger.scheduler("Refresh manager started", {
      taskCount: this.tasks.size,
      policy: {
        price: formatTTL(this.policy.price),
        technicals: formatTTL(this.policy.technicals),
        financials: formatTTL(this.policy.financials),
        sentiment: formatTTL(this.policy.sentiment),
        options: formatTTL(this.policy.options),
      },
    });
  }

  stop(): void {
    this.isRunning = false;
    const keys = Array.from(this.timers.keys());
    for (const key of keys) {
      this.cancelScheduled(key);
    }
    logger.scheduler("Refresh manager stopped");
  }

  getStatus(): {
    isRunning: boolean;
    taskCount: number;
    tasks: Array<{
      symbol: string;
      dataType: DataType;
      lastRefresh: Date | null;
      nextRefresh: Date | null;
      inProgress: boolean;
    }>;
  } {
    return {
      isRunning: this.isRunning,
      taskCount: this.tasks.size,
      tasks: Array.from(this.tasks.values()).map(task => ({
        symbol: task.symbol,
        dataType: task.dataType,
        lastRefresh: task.lastRefresh ? new Date(task.lastRefresh) : null,
        nextRefresh: task.scheduledAt ? new Date(task.scheduledAt) : null,
        inProgress: task.inProgress,
      })),
    };
  }
}

export const refreshManager = new RefreshManager();
