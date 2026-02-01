export interface TTLPolicy {
  price: number;
  technicals: number;
  financials: number;
  sentiment: number;
  options: number;
  snapshot: number;
}

export const DEFAULT_TTL_POLICY: TTLPolicy = {
  price: 60 * 1000,
  technicals: 5 * 60 * 1000,
  financials: 6 * 60 * 60 * 1000,
  sentiment: 15 * 60 * 1000,
  options: 5 * 60 * 1000,
  snapshot: 2 * 60 * 1000,
};

export type DataType = "price" | "technicals" | "financials" | "sentiment" | "options";

export function getTTL(dataType: DataType, policy: TTLPolicy = DEFAULT_TTL_POLICY): number {
  return policy[dataType];
}

export function isStale(lastRefreshTime: number, dataType: DataType, policy: TTLPolicy = DEFAULT_TTL_POLICY): boolean {
  const ttl = getTTL(dataType, policy);
  return Date.now() - lastRefreshTime > ttl;
}

export function getTimeUntilStale(lastRefreshTime: number, dataType: DataType, policy: TTLPolicy = DEFAULT_TTL_POLICY): number {
  const ttl = getTTL(dataType, policy);
  const elapsed = Date.now() - lastRefreshTime;
  return Math.max(0, ttl - elapsed);
}

export function formatTTL(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.round(ms / 3600000)}h`;
}
