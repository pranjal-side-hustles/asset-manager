import { logger } from "../logging/logger";

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 10000,
};

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class MaxRetriesError extends Error {
  public readonly attempts: number;
  public readonly lastError: Error;
  
  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.name = "MaxRetriesError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, maxDelay);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {},
  context?: { provider?: string; symbol?: string }
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  const log = logger.withContext({
    provider: context?.provider,
    symbol: context?.symbol,
  });
  
  let lastError: Error = new Error("Unknown error");
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, opts.timeoutMs);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        log.retry(`Rate limited, attempt ${attempt + 1}/${opts.maxRetries + 1}`, {
          status: response.status,
          url: url.replace(/[?&](api_key|token|key)=[^&]+/gi, "$1=[REDACTED]"),
        });
        
        if (attempt < opts.maxRetries) {
          const delay = calculateBackoff(attempt, opts.baseDelayMs * 2, opts.maxDelayMs);
          await sleep(delay);
          continue;
        }
      }
      
      if (response.status >= 500) {
        log.retry(`Server error, attempt ${attempt + 1}/${opts.maxRetries + 1}`, {
          status: response.status,
        });
        
        if (attempt < opts.maxRetries) {
          const delay = calculateBackoff(attempt, opts.baseDelayMs, opts.maxDelayMs);
          await sleep(delay);
          continue;
        }
      }
      
      return response;
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          log.timeout(`Request timed out after ${opts.timeoutMs}ms, attempt ${attempt + 1}`, {
            timeoutMs: opts.timeoutMs,
          });
          lastError = new TimeoutError(`Request timed out after ${opts.timeoutMs}ms`);
        } else {
          log.retry(`Network error: ${error.message}, attempt ${attempt + 1}`, {
            error: error.message,
          });
          lastError = error;
        }
      }
      
      if (attempt < opts.maxRetries) {
        const delay = calculateBackoff(attempt, opts.baseDelayMs, opts.maxDelayMs);
        await sleep(delay);
      }
    }
  }
  
  throw new MaxRetriesError(
    `Failed after ${opts.maxRetries + 1} attempts`,
    opts.maxRetries + 1,
    lastError
  );
}
