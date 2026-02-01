import type { PartialStockData } from "@shared/types";
import type { FMPPriceData } from "../providers/fmp";
import type { MarketstackPriceQuote } from "../providers/marketstack";

export function normalizeFMPPrice(data: FMPPriceData | null): PartialStockData["price"] {
  if (!data) return undefined;

  return {
    symbol: data.symbol,
    companyName: data.companyName,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume,
    marketCap: data.marketCap,
    sector: data.sector,
    industry: data.industry,
    high: data.high,
    low: data.low,
    open: data.open,
    previousClose: data.previousClose,
  };
}

export function normalizeMarketstackQuote(data: MarketstackPriceQuote | null, symbol: string): PartialStockData["price"] {
  if (!data) return undefined;

  const previousClose = data.open;
  const change = data.price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    symbol: data.symbol || symbol,
    companyName: symbol,
    price: data.price,
    change,
    changePercent,
    volume: data.volume,
    marketCap: 0,
    sector: "Unknown",
    industry: "Unknown",
    high: data.high,
    low: data.low,
    open: data.open,
    previousClose,
  };
}
