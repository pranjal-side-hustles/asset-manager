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
import { isDemoMode } from "../../../domain/dataMode";
import { PriceContext } from "@shared/types";
import { fetchFinnhubQuote } from "../finnhub";
import { getAuthorityRules } from "../../../domain/price/priceAuthority";

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

export interface AggregatedMarketData {
  quote: PriceQuote;
  ohlc: OHLCCandle[];
  technicals: TechnicalIndicators;
  fundamentals: FundamentalsData;
  sentiment: SentimentData;
  options: OptionsData;
  intraday?: {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
    label: string;
  };
  priceStatus: {
    source: string;
    isEOD: boolean;
    eodDate: string;
    timestamp: number;
    label: string; // "Last Market Close" etc
  };
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    timestamp: number;
    cached: boolean;
    isDemoMode?: boolean;
    context: PriceContext;
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

export async function getMarketData(
  symbol: string,
  context: PriceContext = PriceContext.DASHBOARD
): Promise<AggregatedMarketData> {
  const upperSymbol = symbol.toUpperCase();
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];
  const log = logger.withContext({ symbol: upperSymbol }); // Removed context from log to avoid lint
  const rules = getAuthorityRules(context);

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
  let intradayData: AggregatedMarketData["intraday"] | undefined;

  // 1. Fetch EOD Data if required by rules
  if (rules.useMarketstackEOD) {
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
      providersFailed.push("Marketstack-EOD");
      log.providerFailure(`Price unavailable for ${upperSymbol} from Marketstack.`);
    }
  }

  // 2. Fetch Intraday if required by rules
  if (rules.useFinnhubIntraday) {
    const fhQuote = await providerGuard.withGuard("Finnhub", () => fetchFinnhubQuote(upperSymbol));
    if (fhQuote) {
      providersUsed.push("Finnhub-Intraday");
      intradayData = {
        price: fhQuote.c,
        change: fhQuote.d,
        changePercent: fhQuote.dp,
        timestamp: fhQuote.t * 1000,
        label: rules.intradayLabel || "Intraday (estimate)",
      };

      // In SEARCH context, Finnhub provides the primary quote
      if (context === PriceContext.SEARCH) {
        quote = {
          symbol: upperSymbol,
          price: fhQuote.c,
          change: fhQuote.d,
          changePercent: fhQuote.dp,
          open: fhQuote.o,
          high: fhQuote.h,
          low: fhQuote.l,
          previousClose: fhQuote.pc,
          volume: 0, // Finnhub quote doesn't have volume
          timestamp: fhQuote.t * 1000,
        };
        priceSource = "Finnhub";
      }
    } else {
      providersFailed.push("Finnhub-Intraday");
    }
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

  // DEMO MODE FAILSAFE: If price is missing, return mock data to avoid blank states
  if (priceSource === "Unavailable") {
    const mockSnapshot = getMockSnapshot(upperSymbol);
    if (mockSnapshot) {
      log.warn("FALLBACK", `Entering Demo Mode for ${upperSymbol} due to provider failure`);
      return {
        quote: {
          symbol: upperSymbol,
          price: mockSnapshot.price,
          change: mockSnapshot.change,
          changePercent: mockSnapshot.changePercent,
          open: mockSnapshot.price - mockSnapshot.change,
          high: mockSnapshot.price * 1.01,
          low: mockSnapshot.price * 0.99,
          previousClose: mockSnapshot.price - mockSnapshot.change,
          volume: mockSnapshot.volume,
          timestamp: Date.now(),
        },
        ohlc: [],
        technicals: {
          rsi: mockSnapshot.technicals.rsi,
          sma20: mockSnapshot.technicals.movingAverages.ma20,
          sma50: mockSnapshot.technicals.movingAverages.ma50,
          sma200: mockSnapshot.technicals.movingAverages.ma200,
          ema20: mockSnapshot.technicals.movingAverages.ma20,
          ema50: mockSnapshot.technicals.movingAverages.ma50,
          atr: mockSnapshot.technicals.atr,
          atrPercent: mockSnapshot.technicals.atrPercent,
        },
        fundamentals: {
          revenueGrowthYoY: mockSnapshot.fundamentals.revenueGrowthYoY,
          epsGrowthYoY: mockSnapshot.fundamentals.epsGrowthYoY,
          marketCap: mockSnapshot.marketCap,
        },
        sentiment: {
          analystRating: mockSnapshot.sentiment.analystRating?.toString(),
          targetPrice: mockSnapshot.sentiment.analystPriceTarget,
          insiderBuyRatio: mockSnapshot.sentiment.insiderBuying ? 0.7 : 0.3,
          institutionalOwnership: mockSnapshot.sentiment.institutionalOwnership,
        },
        options: {
          putCallRatio: mockSnapshot.sentiment.putCallRatio,
          totalCallOI: 1000000,
          totalPutOI: 800000,
        },
        priceStatus: {
          source: "Demo-Mode",
          isEOD: true,
          eodDate: new Date().toISOString().split("T")[0],
          timestamp: Date.now(),
          label: rules.primaryPriceLabel,
        },
        meta: {
          providersUsed: ["Mock-Fallback"],
          providersFailed,
          timestamp: Date.now(),
          cached: false,
          isDemoMode: true,
          context,
        },
      };
    }
  }

  return {
    quote,
    ohlc: ohlcCandles,
    technicals,
    fundamentals,
    sentiment,
    options,
    intraday: intradayData,
    priceStatus: {
      source: priceSource,
      isEOD: priceSource === "Marketstack",
      eodDate,
      timestamp: Date.now(),
      label: rules.primaryPriceLabel,
    },
    meta: {
      providersUsed,
      providersFailed,
      timestamp: Date.now(),
      cached: dataCached,
      context,
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
