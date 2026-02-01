import { LogEntry, LogType, LogSeverity, LogContext } from "./logTypes";

const REDACTED_KEYS = ["apiKey", "api_key", "token", "secret", "password", "key"];

function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (REDACTED_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.severity}]`,
    `[${entry.type}]`,
  ];
  
  if (entry.symbol) parts.push(`[${entry.symbol}]`);
  if (entry.engine) parts.push(`[${entry.engine}]`);
  if (entry.version) parts.push(`[v${entry.version}]`);
  if (entry.provider) parts.push(`[${entry.provider}]`);
  
  parts.push(entry.message);
  
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    parts.push(JSON.stringify(entry.metadata));
  }
  
  return parts.join(" ");
}

class Logger {
  private context: LogContext = {};
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  withContext(ctx: LogContext): Logger {
    const child = new Logger();
    child.context = { ...this.context, ...ctx };
    child.logBuffer = this.logBuffer;
    return child;
  }

  private log(
    type: LogType,
    severity: LogSeverity,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      ...this.context,
      metadata: sanitizeMetadata(metadata),
    };

    const formatted = formatLogEntry(entry);
    
    switch (severity) {
      case "ERROR":
        console.error(formatted);
        break;
      case "WARN":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    return entry;
  }

  dataFetch(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("DATA_FETCH", "INFO", message, metadata);
  }

  providerFailure(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("PROVIDER_FAILURE", "ERROR", message, metadata);
  }

  engineEvaluation(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("ENGINE_EVALUATION", "INFO", message, metadata);
  }

  cacheHit(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("CACHE_HIT", "INFO", message, metadata);
  }

  cacheMiss(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("CACHE_MISS", "INFO", message, metadata);
  }

  confidenceDowngrade(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("CONFIDENCE_DOWNGRADE", "WARN", message, metadata);
  }

  scheduler(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("SCHEDULER", "INFO", message, metadata);
  }

  retry(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("RETRY", "WARN", message, metadata);
  }

  timeout(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("TIMEOUT", "WARN", message, metadata);
  }

  fallback(message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log("FALLBACK", "WARN", message, metadata);
  }

  info(type: LogType, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log(type, "INFO", message, metadata);
  }

  warn(type: LogType, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log(type, "WARN", message, metadata);
  }

  error(type: LogType, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log(type, "ERROR", message, metadata);
  }

  getRecentLogs(count = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  getLogsBySymbol(symbol: string, count = 50): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.symbol === symbol)
      .slice(-count);
  }

  getLogsByType(type: LogType, count = 50): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.type === type)
      .slice(-count);
  }
}

export const logger = new Logger();
export { Logger };
