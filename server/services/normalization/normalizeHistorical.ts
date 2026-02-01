import type { HistoricalPrice } from "@shared/types";
import type { MarketstackHistoricalData } from "../providers/marketstack";

export function normalizeMarketstackHistorical(
  data: MarketstackHistoricalData | null
): HistoricalPrice[] {
  if (!data || !data.prices) return [];

  return data.prices.map(p => ({
    date: p.date,
    open: p.open,
    high: p.high,
    low: p.low,
    close: p.close,
    volume: p.volume,
  }));
}
