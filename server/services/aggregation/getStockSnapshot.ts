import type {
  StockSnapshot,
  StockFundamentals,
  StockTechnicals,
  StockSentiment,
  StockOptions,
  HistoricalPrice,
  DataConfidence
} from "@shared/types";

import { getMarketData } from "../providers/adapter";
import { stockCache, CACHE_TTL } from "./cache";
import { logger } from "../../infra";
import { isDemoMode } from "../../domain/dataMode";
import { getMockSnapshot } from "./mockFallback";
import { evaluateConfidence, type ConfidenceResult } from "../../domain/confidence/confidenceEvaluator";

const SYMBOL_COMPANY_MAP: Record<string, { name: string; sector: string; industry: string }> = {
  AAPL: { name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics" },
  MSFT: { name: "Microsoft Corporation", sector: "Technology", industry: "Software" },
  GOOGL: { name: "Alphabet Inc.", sector: "Communication Services", industry: "Internet Content" },
  AMZN: { name: "Amazon.com Inc.", sector: "Consumer Discretionary", industry: "E-Commerce" },
  NVDA: { name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors" },
  META: { name: "Meta Platforms Inc.", sector: "Communication Services", industry: "Social Media" },
  TSLA: { name: "Tesla Inc.", sector: "Consumer Discretionary", industry: "Automotive" },
  JPM: { name: "JPMorgan Chase & Co.", sector: "Financial Services", industry: "Banking" },
  V: { name: "Visa Inc.", sector: "Financial Services", industry: "Payment Processing" },
};

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
  providersFailed: string[],
  inputs: {
    priceDataAvailable: boolean;
    technicalsAvailable: boolean;
    fundamentalsAvailable: boolean;
    sentimentAvailable: boolean;
    optionsAvailable: boolean;
  }
): { level: DataConfidence; result: ConfidenceResult } {
  const result = evaluateConfidence({
    providersUsed,
    providersFailed,
    ...inputs,
  });

  return { level: result.level, result };
}

function determineTrend(prices: Array<{ close: number }>): "UP" | "DOWN" | "SIDEWAYS" {
  if (prices.length < 20) return "SIDEWAYS";

  const recent = prices.slice(0, 5).reduce((sum, p) => sum + p.close, 0) / 5;
  const older = prices.slice(15, 20).reduce((sum, p) => sum + p.close, 0) / 5;

  const changePercent = ((recent - older) / older) * 100;

  if (changePercent > 3) return "UP";
  if (changePercent < -3) return "DOWN";
  return "SIDEWAYS";
}

export async function getStockSnapshot(symbol: string): Promise<StockSnapshot | null> {
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `snapshot:${upperSymbol}`;
  const cached = stockCache.get<StockSnapshot>(cacheKey);

  const log = logger.withContext({ symbol: upperSymbol });

  if (cached) {
    log.cacheHit("Using cached snapshot");
    return cached;
  }

  if (isDemoMode()) {
    log.info("DATA_FETCH", "Generating mock snapshot for Demo Mode");
    const mock = getMockSnapshot(upperSymbol);
    if (mock) {
      stockCache.set(cacheKey, mock, CACHE_TTL.SNAPSHOT);
      return mock;
    }
    // Continue to generic fallback if no specific mock exists
  }

  log.cacheMiss("Fetching fresh data via provider adapter");

  try {
    const marketData = await getMarketData(upperSymbol);
    const { quote, ohlc, technicals, fundamentals, sentiment, options, meta } = marketData;

    const companyInfo = SYMBOL_COMPANY_MAP[upperSymbol] || {
      name: `${upperSymbol} Inc.`,
      sector: "Unknown",
      industry: "Unknown",
    };

    const historicalPrices: HistoricalPrice[] = ohlc.map((candle) => ({
      date: new Date(candle.timestamp).toISOString().split("T")[0],
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    const dailyTrend = determineTrend(ohlc);
    const weeklyTrend = determineTrend(ohlc.filter((_, i) => i % 5 === 0));

    const priceVsMA50 = technicals.sma50 && quote.price > 0
      ? ((quote.price - technicals.sma50) / technicals.sma50) * 100
      : 0;
    const priceVsMA200 = technicals.sma200 && quote.price > 0
      ? ((quote.price - technicals.sma200) / technicals.sma200) * 100
      : 0;

    const stockTechnicals: StockTechnicals = {
      atr: technicals.atr || 0,
      atrPercent: technicals.atrPercent || 0,
      rsi: technicals.rsi || 50,
      movingAverages: {
        ma20: technicals.sma20 || 0,
        ma50: technicals.sma50 || 0,
        ma200: technicals.sma200 || 0,
      },
      priceVsMA50,
      priceVsMA200,
      weeklyTrend,
      dailyTrend,
    };

    const stockFundamentals: StockFundamentals = {
      revenueGrowthYoY: fundamentals.revenueGrowthYoY || [],
      epsGrowthYoY: fundamentals.epsGrowthYoY || [],
    };

    const ratingMap: Record<string, number> = {
      "Strong Buy": 5,
      "Buy": 4,
      "Hold": 3,
      "Sell": 2,
      "Strong Sell": 1,
    };

    const stockSentiment: StockSentiment = {
      analystRating: sentiment.analystRating ? ratingMap[sentiment.analystRating] || 3 : undefined,
      analystPriceTarget: sentiment.targetPrice,
      insiderBuying: sentiment.insiderBuyRatio ? sentiment.insiderBuyRatio > 0.5 : undefined,
      institutionalOwnership: sentiment.institutionalOwnership,
      putCallRatio: options.putCallRatio,
    };

    const stockOptions: StockOptions = {
      callOpenInterest: options.totalCallOI,
      putOpenInterest: options.totalPutOI,
    };

    const priceAvailable = quote.price > 0 && marketData.priceStatus.source !== "Unavailable";

    const confidenceResult = determineConfidence(meta.providersUsed, meta.providersFailed, {
      priceDataAvailable: priceAvailable,
      technicalsAvailable: technicals.rsi !== undefined && ohlc.length > 0,
      fundamentalsAvailable: fundamentals.revenueGrowthYoY.length > 0,
      sentimentAvailable: sentiment.analystRating !== undefined,
      optionsAvailable: options.putCallRatio !== undefined,
    });

    const snapshot: StockSnapshot = {
      symbol: upperSymbol,
      companyName: companyInfo.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.volume,
      marketCap: fundamentals.marketCap || 0,
      sector: companyInfo.sector,
      industry: companyInfo.industry,

      fundamentals: {
        ...DEFAULT_FUNDAMENTALS,
        ...stockFundamentals,
      },

      technicals: {
        ...DEFAULT_TECHNICALS,
        ...stockTechnicals,
      },

      sentiment: {
        ...DEFAULT_SENTIMENT,
        ...stockSentiment,
      },

      options: {
        ...DEFAULT_OPTIONS,
        ...stockOptions,
      },

      historicalPrices,

      meta: {
        dataFreshness: new Date(),
        eodDate: marketData.priceStatus.eodDate || undefined,
        priceAvailable,
        providersUsed: meta.providersUsed,
        providersFailed: meta.providersFailed,
        confidence: confidenceResult.level,
        confidenceScore: confidenceResult.result.score,
        confidenceReasons: confidenceResult.result.reasons,
        warnings: [],
      },
    };

    log.dataFetch(`Snapshot ready via ${meta.providersUsed.join(", ")}`, {
      price: quote.price,
      providers: meta.providersUsed.length,
    });

    stockCache.set(cacheKey, snapshot, CACHE_TTL.SNAPSHOT);

    return snapshot;
  } catch (error) {
    log.error("PROVIDER_FAILURE", `Failed to fetch stock data: ${error}`);

    const companyInfo = SYMBOL_COMPANY_MAP[upperSymbol] || {
      name: `${upperSymbol} Inc.`,
      sector: "Unknown",
      industry: "Unknown",
    };

    const fallbackSnapshot: StockSnapshot = {
      symbol: upperSymbol,
      companyName: companyInfo.name,
      price: 100,
      change: 0,
      changePercent: 0,
      volume: 0,
      marketCap: 0,
      sector: companyInfo.sector,
      industry: companyInfo.industry,
      fundamentals: DEFAULT_FUNDAMENTALS,
      technicals: DEFAULT_TECHNICALS,
      sentiment: DEFAULT_SENTIMENT,
      options: DEFAULT_OPTIONS,
      historicalPrices: [],
      meta: {
        dataFreshness: new Date(),
        priceAvailable: false,
        providersUsed: [],
        providersFailed: ["All-Providers"],
        confidence: "LOW",
        confidenceScore: 0,
        confidenceReasons: ["Emergency fallback - all providers failed"],
        warnings: ["Using emergency fallback data"],
      },
    };

    stockCache.set(cacheKey, fallbackSnapshot, 30);
    return fallbackSnapshot;
  }
}
