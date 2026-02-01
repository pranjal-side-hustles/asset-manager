import type {
  MarketDataResult,
  PriceQuote,
  OHLCCandle,
  TechnicalIndicators,
  FundamentalsData,
  SentimentData,
  OptionsData,
} from "./types";
import { twelveDataProvider } from "./twelveDataProvider";
import { mockProvider } from "./mockProvider";
import { logger } from "../../../infra/logging/logger";

const STALENESS_THRESHOLD_MS = 60 * 1000;

export interface CanonicalPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  source: "TwelveData";
  isStale: boolean;
  ageSeconds: number;
}

export interface PriceResult {
  success: boolean;
  data: CanonicalPrice | null;
  error?: string;
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
    isStale: boolean;
    ageSeconds: number;
    timestamp: number;
  };
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    timestamp: number;
  };
}

export async function getCurrentPrice(symbol: string): Promise<PriceResult> {
  const upperSymbol = symbol.toUpperCase();
  const log = logger.withContext({ symbol: upperSymbol });

  if (!twelveDataProvider.isAvailable()) {
    log.providerFailure("TwelveData not available for price quote");
    return {
      success: false,
      data: null,
      error: "Price provider unavailable",
    };
  }

  const quoteResult = await twelveDataProvider.getQuote(upperSymbol);

  if (!quoteResult.success || !quoteResult.data) {
    log.providerFailure(`Failed to fetch price for ${upperSymbol} from TwelveData`);
    return {
      success: false,
      data: null,
      error: "Failed to fetch price from TwelveData",
    };
  }

  const now = Date.now();
  const priceTimestamp = quoteResult.data.timestamp;
  const ageMs = now - priceTimestamp;
  const ageSeconds = Math.round(ageMs / 1000);
  const isStale = ageMs > STALENESS_THRESHOLD_MS;

  if (isStale) {
    log.warn("PROVIDER_FAILURE", `Price for ${upperSymbol} is stale (${ageSeconds}s old)`, {
      price: quoteResult.data.price,
      timestamp: priceTimestamp,
      ageSeconds,
      source: "TwelveData",
    });
  } else {
    log.dataFetch(`Price for ${upperSymbol} from TwelveData`, {
      price: quoteResult.data.price,
      timestamp: priceTimestamp,
      ageSeconds,
      source: "TwelveData",
      isStale: false,
    });
  }

  return {
    success: true,
    data: {
      symbol: upperSymbol,
      price: quoteResult.data.price,
      change: quoteResult.data.change,
      changePercent: quoteResult.data.changePercent,
      timestamp: priceTimestamp,
      source: "TwelveData",
      isStale,
      ageSeconds,
    },
  };
}

function computeTechnicalsFromOHLC(ohlc: OHLCCandle[], currentPrice: number): TechnicalIndicators {
  const closes = ohlc.map(c => c.close);
  
  const calcSMA = (period: number): number => {
    if (closes.length < period) return currentPrice * (0.95 + (period - 20) * -0.001);
    return closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  };

  const sma20 = calcSMA(20);
  const sma50 = calcSMA(50);
  const sma200 = calcSMA(200);

  const recentCandles = ohlc.slice(-15);
  const trueRanges: number[] = [];
  for (let i = 1; i < recentCandles.length; i++) {
    const h = recentCandles[i].high;
    const l = recentCandles[i].low;
    const pc = recentCandles[i - 1].close;
    trueRanges.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const atr = trueRanges.length > 0
    ? trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length
    : currentPrice * 0.02;

  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < Math.min(15, closes.length); i++) {
    const diff = closes[closes.length - i] - closes[closes.length - i - 1];
    if (diff > 0) gains.push(diff);
    else losses.push(Math.abs(diff));
  }
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0.001;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  const calcEMA = (period: number, sma: number): number => {
    if (closes.length < period) return sma;
    const k = 2 / (period + 1);
    let ema = sma;
    const startIdx = Math.max(0, closes.length - period);
    for (let i = startIdx; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  };

  return {
    rsi: parseFloat(Math.min(85, Math.max(15, rsi)).toFixed(2)),
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

  const useTwelveData = twelveDataProvider.isAvailable();

  let quote: PriceQuote;
  let ohlc: OHLCCandle[];
  let technicals: TechnicalIndicators;
  let priceSource = "Mock";
  let priceTimestamp = Date.now();
  let priceIsStale = false;
  let priceAgeSeconds = 0;

  if (useTwelveData) {
    const priceResult = await getCurrentPrice(upperSymbol);
    
    if (priceResult.success && priceResult.data) {
      quote = {
        symbol: priceResult.data.symbol,
        price: priceResult.data.price,
        change: priceResult.data.change,
        changePercent: priceResult.data.changePercent,
        open: 0,
        high: 0,
        low: 0,
        previousClose: 0,
        volume: 0,
        timestamp: priceResult.data.timestamp,
      };
      priceSource = "TwelveData";
      priceTimestamp = priceResult.data.timestamp;
      priceIsStale = priceResult.data.isStale;
      priceAgeSeconds = priceResult.data.ageSeconds;
      providersUsed.push("TwelveData-Quote");
    } else {
      log.providerFailure("Price unavailable from TwelveData - using mock data");
      const mockQuote = await mockProvider.getQuote(upperSymbol);
      quote = mockQuote.data!;
      priceSource = "Mock";
      providersFailed.push("TwelveData-Quote");
      providersUsed.push("Mock-Quote");
    }

    const ohlcResult = await twelveDataProvider.getOHLC(upperSymbol, "1day", 200);
    if (ohlcResult.success && ohlcResult.data && ohlcResult.data.length > 0) {
      ohlc = ohlcResult.data;
      technicals = computeTechnicalsFromOHLC(ohlc, quote.price);
      providersUsed.push("TwelveData-OHLC");
      log.dataFetch("OHLC+Technicals from TwelveData", { candles: ohlc.length });
    } else {
      const mockOhlc = await mockProvider.getOHLC(upperSymbol, "1day", 100);
      ohlc = mockOhlc.data || [];
      technicals = computeTechnicalsFromOHLC(ohlc, quote.price);
      providersFailed.push("TwelveData-OHLC");
      providersUsed.push("Mock-OHLC");
      log.fallback("OHLC failed from TwelveData, using computed values");
    }
  } else {
    log.providerFailure("TwelveData not configured - no real-time prices available");
    const mockQuote = await mockProvider.getQuote(upperSymbol);
    quote = mockQuote.data!;
    priceSource = "Mock";
    providersFailed.push("TwelveData-Quote");
    providersFailed.push("TwelveData-OHLC");
    providersUsed.push("Mock-Quote");
    
    const mockOhlc = await mockProvider.getOHLC(upperSymbol, "1day", 100);
    ohlc = mockOhlc.data || [];
    providersUsed.push("Mock-OHLC");
    
    technicals = computeTechnicalsFromOHLC(ohlc, quote.price);
  }

  providersUsed.push("Computed-Technicals");

  const [fundamentalsResult, sentimentResult, optionsResult] = await Promise.all([
    mockProvider.getFundamentals(upperSymbol),
    mockProvider.getSentiment(upperSymbol),
    mockProvider.getOptions(upperSymbol),
  ]);

  providersUsed.push("Mock-Fundamentals", "Mock-Sentiment", "Mock-Options");

  const fundamentals = fundamentalsResult.data || { revenueGrowthYoY: [], epsGrowthYoY: [] };
  const sentiment = sentimentResult.data || {};
  const options = optionsResult.data || {};

  return {
    quote,
    ohlc,
    technicals,
    fundamentals,
    sentiment,
    options,
    priceStatus: {
      source: priceSource,
      isStale: priceIsStale,
      ageSeconds: priceAgeSeconds,
      timestamp: priceTimestamp,
    },
    meta: {
      providersUsed,
      providersFailed,
      timestamp: Date.now(),
    },
  };
}

export function isProviderAvailable(name: string): boolean {
  switch (name.toLowerCase()) {
    case "twelvedata":
      return twelveDataProvider.isAvailable();
    case "mock":
      return mockProvider.isAvailable();
    default:
      return false;
  }
}

export { twelveDataProvider, mockProvider };
