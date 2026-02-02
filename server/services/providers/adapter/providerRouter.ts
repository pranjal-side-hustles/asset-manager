import type {
  PriceQuote,
  OHLCCandle,
  TechnicalIndicators,
  FundamentalsData,
  SentimentData,
  OptionsData,
} from "./types";
import { mockProvider } from "./mockProvider";
import { rateLimitedFetch } from "../finnhub/rateLimiter";
import {
  fetchMarketstackEOD,
  isMarketstackAvailable,
  clearCache as clearMarketstackCache,
  getCacheStats,
  type EODData,
  type OHLCData,
} from "../marketstack";
import { fetchFinnhubSentiment } from "../finnhub/fetchSentiment";
import { fetchFinnhubInstitutional } from "../finnhub/fetchInstitutional";
import { fetchFinnhubOptions } from "../finnhub/fetchOptions";
import { getMockSnapshot } from "../../aggregation/mockFallback";
import { logger, providerGuard } from "../../../infra";
import { isDemoMode, getDataMode } from "../../../domain/dataMode";

export interface EODPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  date: string;
  open: number;
  high: number;
  low: number;
  volume: number;
  source: "Marketstack";
}

export interface EODPriceResult {
  success: boolean;
  data: EODPrice | null;
  error?: string;
  cached: boolean;
}

export interface AuthoritativePriceResult {
  success: boolean;
  data: EODPrice | null;
  error?: string;
  cached: boolean;
  source: "Marketstack" | "Demo" | "Unavailable";
  mode: "LIVE" | "DEMO";
}

export interface AggregatedMarketData {
  quote: PriceQuote;
  ohlc: OHLCCandle[];
  technicals: TechnicalIndicators;
  fundamentals: FundamentalsData;
  sentiment: SentimentData;
  options: OptionsData;
  priceStatus: {
    source: string;
    isEOD: boolean;
    eodDate: string;
    timestamp: number;
  };
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    timestamp: number;
    cached: boolean;
    isDemoMode?: boolean;
  };
}

export function clearAllCaches(): void {
  clearMarketstackCache();
  logger.info("DATA_FETCH", "All caches cleared");
}

export function getProviderCacheStats() {
  return {
    marketstack: getCacheStats(),
  };
}

export async function getEODPrice(symbol: string): Promise<EODPriceResult> {
  const upperSymbol = symbol.toUpperCase();
  const log = logger.withContext({ symbol: upperSymbol });

  if (!isMarketstackAvailable()) {
    if (isDemoMode()) {
      log.info("DATA_FETCH", "Marketstack unavailable in Demo Mode - using mock price");
    } else {
      log.providerFailure("Marketstack not available - MARKETSTACK_API_KEY not set");
    }
    return {
      success: false,
      data: null,
      error: "Price provider unavailable",
      cached: false,
    };
  }

  const result = await providerGuard.withGuard("Marketstack", () => fetchMarketstackEOD(upperSymbol));

  if (!result || !result.success || !result.data) {
    const errorMsg = result?.error || "Failed to fetch EOD price";
    log.providerFailure(`Price unavailable for ${upperSymbol}: ${errorMsg}`);
    return {
      success: false,
      data: null,
      error: errorMsg,
      cached: false,
    };
  }

  const { eod } = result.data;

  log.dataFetch(`EOD price for ${upperSymbol}: $${eod.close} (${eod.date})`, {
    cached: result.cached,
  });

  return {
    success: true,
    data: {
      symbol: eod.symbol,
      price: eod.close,
      change: eod.change,
      changePercent: eod.changePercent,
      date: eod.date,
      open: eod.open,
      high: eod.high,
      low: eod.low,
      volume: eod.volume,
      source: "Marketstack",
    },
    cached: result.cached,
  };
}

export async function getAuthoritativePrice(symbol: string): Promise<AuthoritativePriceResult> {
  const upperSymbol = symbol.toUpperCase();
  const log = logger.withContext({ symbol: upperSymbol });
  const mode = getDataMode();

  // STRICT MODE GUARD: Enforce price source by mode
  if (mode === "DEMO") {
    log.info("PRICE_SOURCE", `Using DEMO price for ${upperSymbol}`, { source: "Demo" });
    const mockSnapshot = getMockSnapshot(upperSymbol);
    if (mockSnapshot) {
      return {
        success: true,
        data: {
          symbol: upperSymbol,
          price: mockSnapshot.price,
          change: mockSnapshot.change,
          changePercent: mockSnapshot.changePercent,
          date: new Date().toISOString().split("T")[0],
          open: mockSnapshot.price - mockSnapshot.change,
          high: mockSnapshot.price * 1.01,
          low: mockSnapshot.price * 0.99,
          volume: mockSnapshot.volume,
          source: "Marketstack", // Keep type compatibility
        },
        cached: false,
        source: "Demo",
        mode: "DEMO",
      };
    }
    return {
      success: false,
      data: null,
      error: "Demo data unavailable for symbol",
      cached: false,
      source: "Unavailable",
      mode: "DEMO",
    };
  }

  // LIVE MODE: ONLY Marketstack, NO fallbacks
  log.info("PRICE_SOURCE", `Fetching LIVE price for ${upperSymbol}`, { source: "Marketstack" });

  if (!isMarketstackAvailable()) {
    log.providerFailure("Marketstack not available - MARKETSTACK_API_KEY not set");
    return {
      success: false,
      data: null,
      error: "Price provider unavailable",
      cached: false,
      source: "Unavailable",
      mode: "LIVE",
    };
  }

  const result = await getEODPrice(upperSymbol);

  if (result.success && result.data) {
    log.info("PRICE_SOURCE", `LIVE price acquired for ${upperSymbol}: $${result.data.price}`, {
      source: "Marketstack",
      cached: result.cached,
      date: result.data.date,
    });
  } else {
    log.providerFailure(`LIVE price unavailable for ${upperSymbol} - NO FALLBACK`, {
      source: "Marketstack",
      error: result.error,
    });
  }

  return {
    ...result,
    source: result.success ? "Marketstack" : "Unavailable",
    mode: "LIVE",
  };
}

function computeTechnicalsFromOHLC(ohlc: (OHLCData | OHLCCandle)[], currentPrice: number): TechnicalIndicators {
  const closes = ohlc.map(c => c.close);

  const calcSMA = (period: number): number => {
    if (closes.length < period) {
      return closes.length > 0 ? closes.reduce((a, b) => a + b, 0) / closes.length : currentPrice;
    }
    return closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  };

  const sma20 = calcSMA(20);
  const sma50 = calcSMA(50);
  const sma200 = calcSMA(200);

  const calcATR = (period: number): number => {
    if (ohlc.length < period + 1) return currentPrice * 0.02;

    const trueRanges: number[] = [];
    for (let i = 0; i < Math.min(period, ohlc.length - 1); i++) {
      const current = ohlc[i];
      const previous = ohlc[i + 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      trueRanges.push(tr);
    }

    return trueRanges.length > 0
      ? trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length
      : currentPrice * 0.02;
  };

  const calcRSI = (period: number): number => {
    if (closes.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 0; i < period && i < closes.length - 1; i++) {
      const diff = closes[i] - closes[i + 1];
      if (diff > 0) {
        gains.push(diff);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(diff));
      }
    }

    const avgGain = gains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const atr = calcATR(14);
  const rsi = calcRSI(14);

  const calcEMA = (period: number, sma: number): number => {
    if (closes.length < period) return sma;
    const k = 2 / (period + 1);
    let ema = sma;
    for (let i = Math.min(period, closes.length) - 1; i >= 0; i--) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  };

  return {
    rsi: parseFloat(Math.min(100, Math.max(0, rsi)).toFixed(2)),
    sma20: parseFloat(sma20.toFixed(2)),
    sma50: parseFloat(sma50.toFixed(2)),
    sma200: parseFloat(sma200.toFixed(2)),
    ema20: parseFloat(calcEMA(20, sma20).toFixed(2)),
    ema50: parseFloat(calcEMA(50, sma50).toFixed(2)),
    atr: parseFloat(atr.toFixed(2)),
    atrPercent: parseFloat(((atr / currentPrice) * 100).toFixed(2)),
  };
}

export async function getMarketData(symbol: string): Promise<AggregatedMarketData> {
  const upperSymbol = symbol.toUpperCase();
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];
  const log = logger.withContext({ symbol: upperSymbol });

  let quote: PriceQuote = {
    symbol: upperSymbol,
    price: 0,
    change: 0,
    changePercent: 0,
    open: 0,
    high: 0,
    low: 0,
    previousClose: 0,
    volume: 0,
    timestamp: 0,
  };
  let ohlcCandles: OHLCCandle[] = [];
  let technicals: TechnicalIndicators = {
    rsi: 0,
    sma20: 0,
    sma50: 0,
    sma200: 0,
    ema20: 0,
    ema50: 0,
    atr: 0,
    atrPercent: 0,
  };
  let priceSource = "Unavailable";
  let eodDate = "";
  let dataCached = false;

  const eodResult = await providerGuard.withGuard("Marketstack", () => fetchMarketstackEOD(upperSymbol));

  if (eodResult && eodResult.success && eodResult.data) {
    const { eod, ohlc } = eodResult.data;

    quote = {
      symbol: eod.symbol,
      price: eod.close,
      change: eod.change,
      changePercent: eod.changePercent,
      open: eod.open,
      high: eod.high,
      low: eod.low,
      previousClose: ohlc[1]?.close || eod.close,
      volume: eod.volume,
      timestamp: new Date(eod.date).getTime(),
    };

    ohlcCandles = ohlc.map(d => ({
      timestamp: new Date(d.date).getTime(),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    technicals = computeTechnicalsFromOHLC(ohlc, eod.close);

    priceSource = "Marketstack";
    eodDate = eod.date;
    dataCached = eodResult.cached;
    providersUsed.push("Marketstack-EOD");

    log.dataFetch(`Market data for ${upperSymbol}: EOD $${eod.close} (${eod.date})`, {
      cached: dataCached,
      ohlcDays: ohlc.length,
    });
  } else {
    priceSource = "Unavailable";
    providersFailed.push("Marketstack-EOD");

    log.providerFailure(`Price unavailable for ${upperSymbol} from Marketstack. EOD price is MANDATORY and Finnhub fallback is DISABLED for prices.`);
  }

  providersUsed.push("Local-Technicals");

  // Fetch true signals from Finnhub instead of mocks
  const [sentimentData, institutionalData, optionsData] = await Promise.all([
    fetchFinnhubSentiment(upperSymbol),
    fetchFinnhubInstitutional(upperSymbol),
    fetchFinnhubOptions(upperSymbol),
  ]);

  const fundamentals: FundamentalsData = {
    revenueGrowthYoY: [], // Finnhub doesn't provide these easily in the free tier
    epsGrowthYoY: [],
    marketCap: institutionalData?.institutionalOwnership ? institutionalData.institutionalOwnership * 100 : 0, // Mocked cap if needed, but Marketstack usually provides it
  };

  const sentiment: SentimentData = {
    analystRating: sentimentData?.analystRating?.toString(),
    targetPrice: sentimentData?.analystPriceTarget,
    insiderBuyRatio: sentimentData?.insiderBuying ? 0.8 : 0.2, // Simplified mapping
    institutionalOwnership: institutionalData?.institutionalOwnership,
  };

  const options: OptionsData = {
    putCallRatio: optionsData?.putCallRatio,
    totalCallOI: optionsData?.callOpenInterest,
    totalPutOI: optionsData?.putOpenInterest,
  };

  if (sentimentData) providersUsed.push("Finnhub-Sentiment");
  if (institutionalData) providersUsed.push("Finnhub-Institutional");
  if (optionsData) providersUsed.push("Finnhub-Options");

  return {
    quote,
    ohlc: ohlcCandles,
    technicals,
    fundamentals,
    sentiment,
    options,
    priceStatus: {
      source: priceSource,
      isEOD: true,
      eodDate,
      timestamp: Date.now(),
    },
    meta: {
      providersUsed,
      providersFailed,
      timestamp: Date.now(),
      cached: dataCached,
    },
  };
}

export function isProviderAvailable(name: string): boolean {
  switch (name.toLowerCase()) {
    case "marketstack":
      return isMarketstackAvailable();
    case "mock":
      return mockProvider.isAvailable();
    default:
      return false;
  }
}

export { mockProvider };
