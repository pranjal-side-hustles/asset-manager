export type LogSeverity = "INFO" | "WARN" | "ERROR";

export type LogType =
  | "DATA_FETCH"
  | "PROVIDER_FAILURE"
  | "ENGINE_EVALUATION"
  | "CACHE_HIT"
  | "CACHE_MISS"
  | "CONFIDENCE_DOWNGRADE"
  | "SCHEDULER"
  | "RETRY"
  | "TIMEOUT"
  | "FALLBACK";

export interface LogEntry {
  timestamp: string;
  type: LogType;
  severity: LogSeverity;
  message: string;
  symbol?: string;
  engine?: string;
  version?: string;
  provider?: string;
  metadata?: Record<string, unknown>;
}

export interface LogContext {
  symbol?: string;
  engine?: string;
  version?: string;
  provider?: string;
}
