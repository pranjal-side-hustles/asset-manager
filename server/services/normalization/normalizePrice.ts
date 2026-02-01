import type { PartialStockData } from "@shared/types";
import type { PriceQuote } from "../providers/adapter/types";
import type { EODData } from "../providers/marketstack";

export function normalizeEODQuote(data: EODData | null, symbol: string): PartialStockData["price"] {
  if (!data) return undefined;

  return {
    symbol: data.symbol || symbol,
    companyName: symbol,
    price: data.close,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume || 0,
    marketCap: 0,
    sector: "Unknown",
    industry: "Unknown",
    high: data.high,
    low: data.low,
    open: data.open,
    previousClose: data.close - data.change,
  };
}

export function normalizePriceQuote(data: PriceQuote | null, symbol: string): PartialStockData["price"] {
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
