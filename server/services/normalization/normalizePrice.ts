import type { PartialStockData } from "@shared/types";
import type { MarketstackPriceQuote } from "../providers/marketstack";
import type { PriceQuote } from "../providers/adapter/types";

export function normalizeTwelveDataQuote(data: PriceQuote | null, symbol: string): PartialStockData["price"] {
  if (!data) return undefined;

  return {
    symbol: data.symbol || symbol,
    companyName: symbol,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume || 0,
    marketCap: 0,
    sector: "Unknown",
    industry: "Unknown",
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
