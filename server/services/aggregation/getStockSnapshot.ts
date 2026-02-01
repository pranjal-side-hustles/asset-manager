import type { 
  StockSnapshot, 
  StockFundamentals, 
  StockTechnicals, 
  StockSentiment, 
  StockOptions,
  HistoricalPrice,
  DataConfidence 
} from "@shared/types";

import { fetchFMPPrice, fetchFMPFinancials, fetchFMPTechnicals } from "../providers/fmp";
import { fetchFinnhubSentiment, fetchFinnhubInstitutional, fetchFinnhubOptions } from "../providers/finnhub";
import { fetchMarketstackHistorical } from "../providers/marketstack";

import { normalizeFMPPrice } from "../normalization/normalizePrice";
import { normalizeFMPFinancials } from "../normalization/normalizeFinancials";
import { normalizeFMPTechnicals } from "../normalization/normalizeTechnicals";
import { normalizeFinnhubSentiment, normalizeFinnhubOptions, normalizePutCallRatio } from "../normalization/normalizeSentiment";
import { normalizeMarketstackHistorical } from "../normalization/normalizeHistorical";

import { stockCache, CACHE_TTL } from "./cache";

const DEFAULT_FUNDAMENTALS: StockFundamentals = {
  revenueGrowthYoY: [],
  epsGrowthYoY: [],
};

const DEFAULT_TECHNICALS: StockTechnicals = {
  atr: 0,
  atrPercent: 0,
  rsi: 50,
  movingAverages: { ma20: 0, ma50: 0, ma200: 0 },
  priceVsMA50: 0,
  priceVsMA200: 0,
  weeklyTrend: "SIDEWAYS",
  dailyTrend: "SIDEWAYS",
};

const DEFAULT_SENTIMENT: StockSentiment = {};
const DEFAULT_OPTIONS: StockOptions = {};

function determineConfidence(
  providersUsed: string[],
  providersFailed: string[]
): DataConfidence {
  const successRate = providersUsed.length / (providersUsed.length + providersFailed.length);
  
  if (successRate >= 0.8) return "HIGH";
  if (successRate >= 0.5) return "MEDIUM";
  return "LOW";
}

export async function getStockSnapshot(symbol: string): Promise<StockSnapshot | null> {
  const cacheKey = `snapshot:${symbol}`;
  const cached = stockCache.get<StockSnapshot>(cacheKey);
  
  if (cached) {
    console.log(`[Cache] Using cached snapshot for ${symbol}`);
    return cached;
  }

  console.log(`[Aggregator] Fetching fresh data for ${symbol}`);

  const providersUsed: string[] = [];
  const providersFailed: string[] = [];
  const warnings: string[] = [];

  const [
    fmpPriceResult,
    fmpFinancialsResult,
    fmpTechnicalsResult,
    finnhubSentimentResult,
    finnhubInstitutionalResult,
    finnhubOptionsResult,
    marketstackHistoricalResult
  ] = await Promise.allSettled([
    fetchFMPPrice(symbol),
    fetchFMPFinancials(symbol),
    fetchFMPTechnicals(symbol),
    fetchFinnhubSentiment(symbol),
    fetchFinnhubInstitutional(symbol),
    fetchFinnhubOptions(symbol),
    fetchMarketstackHistorical(symbol)
  ]);

  const fmpPrice = fmpPriceResult.status === "fulfilled" ? fmpPriceResult.value : null;
  const fmpFinancials = fmpFinancialsResult.status === "fulfilled" ? fmpFinancialsResult.value : null;
  const fmpTechnicals = fmpTechnicalsResult.status === "fulfilled" ? fmpTechnicalsResult.value : null;
  const finnhubSentiment = finnhubSentimentResult.status === "fulfilled" ? finnhubSentimentResult.value : null;
  const finnhubInstitutional = finnhubInstitutionalResult.status === "fulfilled" ? finnhubInstitutionalResult.value : null;
  const finnhubOptions = finnhubOptionsResult.status === "fulfilled" ? finnhubOptionsResult.value : null;
  const marketstackHistorical = marketstackHistoricalResult.status === "fulfilled" ? marketstackHistoricalResult.value : null;

  if (fmpPrice) providersUsed.push("FMP-Price");
  else {
    providersFailed.push("FMP-Price");
    warnings.push("Price data unavailable from primary source");
  }

  if (fmpFinancials) providersUsed.push("FMP-Financials");
  else {
    providersFailed.push("FMP-Financials");
    warnings.push("Financial data may be incomplete");
  }

  if (fmpTechnicals) providersUsed.push("FMP-Technicals");
  else {
    providersFailed.push("FMP-Technicals");
    warnings.push("Technical indicators may be incomplete");
  }

  if (finnhubSentiment) providersUsed.push("Finnhub-Sentiment");
  else providersFailed.push("Finnhub-Sentiment");

  if (finnhubInstitutional) providersUsed.push("Finnhub-Institutional");
  else providersFailed.push("Finnhub-Institutional");

  if (finnhubOptions) providersUsed.push("Finnhub-Options");
  else providersFailed.push("Finnhub-Options");

  if (marketstackHistorical) providersUsed.push("Marketstack-Historical");
  else providersFailed.push("Marketstack-Historical");

  if (!fmpPrice) {
    console.warn(`[Aggregator] No price data available for ${symbol}`);
    return null;
  }

  const normalizedPrice = normalizeFMPPrice(fmpPrice);
  const normalizedFundamentals = normalizeFMPFinancials(fmpFinancials);
  const normalizedTechnicals = normalizeFMPTechnicals(fmpTechnicals, fmpPrice);
  const normalizedSentiment = normalizeFinnhubSentiment(finnhubSentiment, finnhubInstitutional);
  const normalizedOptions = normalizeFinnhubOptions(finnhubOptions);
  const normalizedHistorical = normalizeMarketstackHistorical(marketstackHistorical);

  const putCallRatio = normalizePutCallRatio(finnhubOptions);
  if (putCallRatio !== undefined) {
    normalizedSentiment.putCallRatio = putCallRatio;
  }

  const snapshot: StockSnapshot = {
    symbol: normalizedPrice!.symbol,
    companyName: normalizedPrice!.companyName,
    price: normalizedPrice!.price,
    change: normalizedPrice!.change,
    changePercent: normalizedPrice!.changePercent,
    volume: normalizedPrice!.volume,
    marketCap: normalizedPrice!.marketCap,
    sector: normalizedPrice!.sector,
    industry: normalizedPrice!.industry,

    fundamentals: {
      ...DEFAULT_FUNDAMENTALS,
      ...normalizedFundamentals,
    },

    technicals: {
      ...DEFAULT_TECHNICALS,
      ...normalizedTechnicals,
    } as StockTechnicals,

    sentiment: {
      ...DEFAULT_SENTIMENT,
      ...normalizedSentiment,
    },

    options: {
      ...DEFAULT_OPTIONS,
      ...normalizedOptions,
    },

    historicalPrices: normalizedHistorical,

    meta: {
      dataFreshness: new Date(),
      providersUsed,
      providersFailed,
      confidence: determineConfidence(providersUsed, providersFailed),
      warnings,
    },
  };

  stockCache.set(cacheKey, snapshot, CACHE_TTL.SNAPSHOT);

  return snapshot;
}
