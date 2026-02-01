import type { StockFundamentals } from "@shared/types";
import type { FundamentalsData } from "../providers/adapter/types";

export function normalizeFundamentals(data: FundamentalsData | null): Partial<StockFundamentals> {
  if (!data) return {};

  return {
    revenueGrowthYoY: data.revenueGrowthYoY || [],
    epsGrowthYoY: data.epsGrowthYoY || [],
    peRatio: data.peRatio,
  };
}
