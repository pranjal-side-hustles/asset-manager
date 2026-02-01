import type { StockFundamentals } from "@shared/types";
import type { FMPFinancialsData } from "../providers/fmp";

export function normalizeFMPFinancials(data: FMPFinancialsData | null): Partial<StockFundamentals> {
  if (!data) return {};

  return {
    revenueGrowthYoY: data.revenueGrowthYoY,
    epsGrowthYoY: data.epsGrowthYoY,
    peRatio: data.peRatio,
    forwardPE: data.forwardPE,
    priceToBook: data.priceToBook,
    debtToEquity: data.debtToEquity,
    freeCashFlowYield: data.freeCashFlowYield,
  };
}
