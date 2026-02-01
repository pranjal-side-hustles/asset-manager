import type { StockTechnicals } from "@shared/types";
import type { TechnicalIndicators, PriceQuote } from "../providers/adapter/types";

export function normalizeTechnicals(
  techData: TechnicalIndicators | null,
  priceData: PriceQuote | null
): Partial<StockTechnicals> {
  if (!techData) return {};

  const currentPrice = priceData?.price || 0;
  const sma20 = techData.sma20 ?? 0;
  const sma50 = techData.sma50 ?? 0;
  const sma200 = techData.sma200 ?? 0;

  return {
    atr: techData.atr ?? 0,
    atrPercent: techData.atrPercent ?? 0,
    rsi: techData.rsi ?? 50,
    movingAverages: {
      ma20: sma20,
      ma50: sma50,
      ma200: sma200,
    },
    priceVsMA50: sma50 > 0 ? ((currentPrice - sma50) / sma50) * 100 : 0,
    priceVsMA200: sma200 > 0 ? ((currentPrice - sma200) / sma200) * 100 : 0,
    weeklyTrend: "SIDEWAYS",
    dailyTrend: "SIDEWAYS",
  };
}
