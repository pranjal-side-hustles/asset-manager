import type { StockSentiment, StockOptions, InstitutionalTrend } from "@shared/types";
import type { FinnhubSentimentData } from "../providers/finnhub";
import type { FinnhubInstitutionalData } from "../providers/finnhub";
import type { FinnhubOptionsData } from "../providers/finnhub";

export function normalizeFinnhubSentiment(
  sentimentData: FinnhubSentimentData | null,
  institutionalData: FinnhubInstitutionalData | null
): Partial<StockSentiment> {
  const result: Partial<StockSentiment> = {};

  if (sentimentData) {
    result.insiderBuying = sentimentData.insiderBuying;
    result.analystRating = sentimentData.analystRating;
    result.analystPriceTarget = sentimentData.analystPriceTarget;
  }

  if (institutionalData) {
    result.institutionalOwnership = institutionalData.institutionalOwnership;
    result.institutionalTrend = institutionalData.institutionalTrend as InstitutionalTrend;
  }

  return result;
}

export function normalizeFinnhubOptions(data: FinnhubOptionsData | null): Partial<StockOptions> {
  if (!data) return {};

  return {
    impliedVolatility: data.impliedVolatility,
    ivRank: data.ivRank,
    totalOpenInterest: data.totalOpenInterest,
    callOpenInterest: data.callOpenInterest,
    putOpenInterest: data.putOpenInterest,
  };
}

export function normalizePutCallRatio(optionsData: FinnhubOptionsData | null): number | undefined {
  if (!optionsData) return undefined;
  return optionsData.putCallRatio;
}
