import type { StockTechnicals } from "@shared/types";
import type { FMPTechnicalsData } from "../providers/fmp";
import type { FMPPriceData } from "../providers/fmp";

export function normalizeFMPTechnicals(
  techData: FMPTechnicalsData | null,
  priceData: FMPPriceData | null
): Partial<StockTechnicals> {
  if (!techData) return {};

  const currentPrice = techData.currentPrice || priceData?.price || 0;

  return {
    atr: techData.atr,
    atrPercent: techData.atrPercent,
    rsi: techData.rsi,
    movingAverages: {
      ma20: techData.ma20,
      ma50: techData.ma50 || priceData?.ma50 || 0,
      ma200: techData.ma200 || priceData?.ma200 || 0,
    },
    priceVsMA50: techData.ma50 > 0 ? ((currentPrice - techData.ma50) / techData.ma50) * 100 : 0,
    priceVsMA200: techData.ma200 > 0 ? ((currentPrice - techData.ma200) / techData.ma200) * 100 : 0,
    weeklyTrend: techData.weeklyTrend,
    dailyTrend: techData.dailyTrend,
  };
}
