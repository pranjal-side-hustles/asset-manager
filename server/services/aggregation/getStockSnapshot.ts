import type {
  StockSnapshot,
  StockFundamentals,
  StockTechnicals,
  StockSentiment,
  StockOptions,
  HistoricalPrice,
  DataConfidence
} from "@shared/types";
import { PriceContext } from "@shared/types";

import { getMarketData } from "../providers/adapter";
import { stockCache, CACHE_TTL } from "./cache";
import { logger } from "../../infra";
import { isDemoMode } from "../../domain/dataMode";
import { getMockSnapshot, getBenchmarkPrice } from "./mockFallback";
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

export async function getStockSnapshot(
  symbol: string,
  context: PriceContext = PriceContext.DASHBOARD
): Promise<StockSnapshot | null> {
  const upperSymbol = symbol.toUpperCase();
  const cacheKey = `snapshot:${upperSymbol}:${context}`;
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

    // Fallback: Generate a generic mock snapshot for Demo Mode so no symbol returns null or fails
    const genericMock = generateGenericMock(upperSymbol);
    stockCache.set(cacheKey, genericMock, CACHE_TTL.SNAPSHOT);
    return genericMock;
  }

  log.cacheMiss(`Fetching fresh data via provider adapter (Context: ${context})`);

  try {
    const marketData = await getMarketData(upperSymbol, context);
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
    const benchmark = getBenchmarkPrice(upperSymbol);

    // Sanity check: If the provider returns a price that is > 20% away from benchmark, it's likely bad data
    if (priceAvailable && benchmark && (Math.abs(quote.price - benchmark) / benchmark > 0.20)) {
      log.warn("DATA_FETCH", `Provider returned suspicious price for ${upperSymbol}: $${quote.price} (Benchmark: $${benchmark}). Falling back to mock.`);
      // STRICT MODE: Only fallback to mock if in DEMO mode
      if (isDemoMode()) {
        return getMockSnapshot(upperSymbol) || generateGenericMock(upperSymbol);
      }
      // In LIVE mode, continue with the suspicious price but log a warning
      log.warn("DATA_FETCH", `Continuing with suspicious price in LIVE mode for ${upperSymbol}`);
    }

    if (!priceAvailable || quote.price <= 0) {
      log.warn("DATA_FETCH", `Provider returned invalid price for ${upperSymbol}. Price unavailable.`);
      // STRICT MODE: Only fallback to mock if in DEMO mode
      if (isDemoMode()) {
        return getMockSnapshot(upperSymbol) || generateGenericMock(upperSymbol);
      }
      // In LIVE mode, return a snapshot with priceAvailable: false instead of fabricating data
      const companyInfo = SYMBOL_COMPANY_MAP[upperSymbol] || {
        name: `${upperSymbol} Inc.`,
        sector: "Unknown",
        industry: "Unknown",
      };

      return {
        symbol: upperSymbol,
        companyName: companyInfo.name,
        price: 0,
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
          eodDate: marketData.priceStatus.eodDate || undefined,
          priceAvailable: false,
          priceLabel: "Price unavailable (EOD)",
          providersUsed: meta.providersUsed,
          providersFailed: meta.providersFailed,
          confidence: "LOW",
          confidenceScore: 0,
          confidenceReasons: ["Price unavailable in LIVE mode - no fallback"],
          warnings: ["Price unavailable (EOD)"],
        },
      };
    }

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

      intraday: marketData.intraday,

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
        priceLabel: marketData.priceStatus.label,
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

    // STRICT MODE: Only fallback to mock data if we are in DEMO mode.
    // In LIVE mode, we must return a sanitised error state to avoid fabricated prices.
    if (isDemoMode()) {
      return getMockSnapshot(upperSymbol) || generateGenericMock(upperSymbol);
    }

    // Live Mode Emergency Fallback (No fake prices)
    return {
      symbol: upperSymbol,
      companyName: upperSymbol,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      marketCap: 0,
      sector: "Unknown",
      industry: "Unknown",
      fundamentals: { revenueGrowthYoY: [], epsGrowthYoY: [] },
      technicals: {
        atr: 0, atrPercent: 0, rsi: 0,
        movingAverages: { ma20: 0, ma50: 0, ma200: 0 },
        priceVsMA50: 0, priceVsMA200: 0,
        weeklyTrend: "SIDEWAYS", dailyTrend: "SIDEWAYS"
      },
      sentiment: { analystRating: 3 }, // Hold
      options: {},
      historicalPrices: [],
      meta: {
        dataFreshness: new Date(),
        priceAvailable: false,
        providersUsed: [],
        providersFailed: ["All-Providers"],
        confidence: "LOW",
        confidenceScore: 0,
        confidenceReasons: ["Strict Mode: Provider failed in Live Mode"],
        warnings: ["Price Unavailable (Provider Failure)"],
      },
    };
  }
}

function generateGenericMock(symbol: string): StockSnapshot {
  const upperSymbol = symbol.toUpperCase();
  const benchmark = getBenchmarkPrice(upperSymbol);
  const s = upperSymbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  // Use benchmark if available, otherwise generate stable pseudorandom
  const basePrice = benchmark || (100 + (s % 400));
  const change = (s % 10) - 5;

  return {
    symbol: upperSymbol,
    companyName: `${upperSymbol} Inc. (Syncing)`,
    price: basePrice,
    change: change,
    changePercent: (change / basePrice) * 100,
    volume: 1000000 + (s * 1000),
    marketCap: 1000000000 + (s * 10000000),
    sector: "Technology",
    industry: "Various",
    fundamentals: {
      revenueGrowthYoY: [15, 18, 16], // High growth to hit buckets
      epsGrowthYoY: [20, 22, 19],
    },
    technicals: {
      atr: basePrice * 0.02,
      atrPercent: 2,
      rsi: 65, // Stronger RSI
      movingAverages: { ma20: basePrice * 0.98, ma50: basePrice * 0.95, ma200: basePrice * 0.90 },
      priceVsMA50: 5,
      priceVsMA200: 10,
      weeklyTrend: "UP",
      dailyTrend: "UP",
    },
    sentiment: { analystRating: 4 },
    options: {},
    historicalPrices: [],
    meta: {
      dataFreshness: new Date(),
      priceAvailable: true,
      providersUsed: ["Mock-Failsafe"],
      providersFailed: [],
      confidence: "MEDIUM",
      confidenceScore: 60,
      confidenceReasons: ["Failsafe mock data generated"],
      warnings: ["Synchronizing data (Demo Mode)"],
    },
  };
}
