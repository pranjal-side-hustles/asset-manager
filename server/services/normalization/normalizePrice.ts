import type { PartialStockData } from "@shared/types";
import type { FMPPriceData } from "../providers/fmp";

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
