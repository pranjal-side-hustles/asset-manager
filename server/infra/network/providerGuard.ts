import { logger } from "../logging/logger";

export interface ProviderHealth {
  name: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  cooldownUntil: Date | null;
  totalRequests: number;
  totalFailures: number;
}

interface ProviderState {
  consecutiveFailures: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  cooldownUntil: Date | null;
  totalRequests: number;
  totalFailures: number;
}

const MAX_CONSECUTIVE_FAILURES = 5;
const BASE_COOLDOWN_MS = 30000;
const MAX_COOLDOWN_MS = 300000;

class ProviderGuard {
  private providers: Map<string, ProviderState> = new Map();

  private getOrCreateState(provider: string): ProviderState {
    if (!this.providers.has(provider)) {
      this.providers.set(provider, {
        consecutiveFailures: 0,
        lastFailure: null,
        lastSuccess: null,
        cooldownUntil: null,
        totalRequests: 0,
        totalFailures: 0,
      });
    }
    return this.providers.get(provider)!;
  }

  isAvailable(provider: string): boolean {
    const state = this.getOrCreateState(provider);
    
    if (state.cooldownUntil && new Date() < state.cooldownUntil) {
      return false;
    }
    
    if (state.cooldownUntil && new Date() >= state.cooldownUntil) {
      state.cooldownUntil = null;
      logger.withContext({ provider }).info(
        "DATA_FETCH",
        "Provider cooldown expired, re-enabling"
      );
    }
    
    return true;
  }

  recordSuccess(provider: string): void {
    const state = this.getOrCreateState(provider);
    state.consecutiveFailures = 0;
    state.lastSuccess = new Date();
    state.totalRequests++;
    state.cooldownUntil = null;
  }

  recordFailure(provider: string, error?: Error): void {
    const state = this.getOrCreateState(provider);
    state.consecutiveFailures++;
    state.lastFailure = new Date();
    state.totalRequests++;
    state.totalFailures++;
    
    const log = logger.withContext({ provider });
    
    if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const cooldownMs = Math.min(
        BASE_COOLDOWN_MS * Math.pow(2, state.consecutiveFailures - MAX_CONSECUTIVE_FAILURES),
        MAX_COOLDOWN_MS
      );
      state.cooldownUntil = new Date(Date.now() + cooldownMs);
      
      log.providerFailure(
        `Provider disabled for ${cooldownMs / 1000}s after ${state.consecutiveFailures} failures`,
        {
          cooldownMs,
          consecutiveFailures: state.consecutiveFailures,
          error: error?.message,
        }
      );
    } else {
      log.providerFailure(
        `Provider failure ${state.consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`,
        { error: error?.message }
      );
    }
  }

  getHealth(provider: string): ProviderHealth {
    const state = this.getOrCreateState(provider);
    return {
      name: provider,
      isHealthy: this.isAvailable(provider) && state.consecutiveFailures < MAX_CONSECUTIVE_FAILURES / 2,
      consecutiveFailures: state.consecutiveFailures,
      lastFailure: state.lastFailure,
      lastSuccess: state.lastSuccess,
      cooldownUntil: state.cooldownUntil,
      totalRequests: state.totalRequests,
      totalFailures: state.totalFailures,
    };
  }

  getAllHealth(): ProviderHealth[] {
    const providers = ["Marketstack", "Finnhub", "Mock"];
    return providers.map(p => this.getHealth(p));
  }

  resetProvider(provider: string): void {
    this.providers.delete(provider);
    logger.withContext({ provider }).info("DATA_FETCH", "Provider state reset");
  }

  async withGuard<T>(
    provider: string,
    fn: () => Promise<T>,
    fallback?: () => T
  ): Promise<T | null> {
    if (!this.isAvailable(provider)) {
      logger.withContext({ provider }).fallback("Provider in cooldown, skipping request");
      return fallback ? fallback() : null;
    }

    try {
      const result = await fn();
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      this.recordFailure(provider, error instanceof Error ? error : undefined);
      if (fallback) {
        logger.withContext({ provider }).fallback("Using fallback after provider failure");
        return fallback();
      }
      return null;
    }
  }
}

export const providerGuard = new ProviderGuard();
