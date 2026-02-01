import type {
  PriceQuote,
  OHLCCandle,
  TechnicalIndicators,
  FundamentalsData,
  SentimentData,
  OptionsData,
} from "./types";
import { mockProvider } from "./mockProvider";
import { rateLimitedFetch } from "../providers/finnhub/rateLimiter";
import { 
  fetchMarketstackEOD, 
  isMarketstackAvailable,
  clearCache as clearMarketstackCache,
  getCacheStats,
  type EODData,
  type OHLCData,
} from "../marketstack";
import { logger, providerGuard } from "../../../infra";

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
    log.providerFailure("Marketstack not available - MARKETSTACK_API_KEY not set");
    return {
      success: false,
      data: null,
      error: "Price provider unavailable",
      cached: false,
    };
  }

  const result = await fetchMarketstackEOD(upperSymbol);

  if (!result.success || !result.data) {
    log.providerFailure(`Price unavailable for ${upperSymbol}: ${result.error}`);
    return {
      success: false,
      data: null,
      error: result.error || "Failed to fetch EOD price",
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

function computeTechnicalsFromOHLC(ohlc: OHLCData[], currentPrice: number): TechnicalIndicators {
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

  let quote: PriceQuote;
  let ohlcCandles: OHLCCandle[];
  let technicals: TechnicalIndicators;
  let priceSource = "Unavailable";
  let eodDate = "";
  let dataCached = false;

  const eodResult = await fetchMarketstackEOD(upperSymbol);

  if (eodResult.success && eodResult.data) {
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
    log.providerFailure(`Price unavailable for ${upperSymbol}: ${eodResult.error}`);
    providersFailed.push("Marketstack-EOD");

    // Try Finnhub quote as a fallback for EOD/price data
    const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
    let finnSuccess = false;

    if (FINNHUB_API_KEY) {
      const fhData = await providerGuard.withGuard("Finnhub", async () => {
        const fhUrl = `https://finnhub.io/api/v1/quote?symbol=${upperSymbol}&token=${FINNHUB_API_KEY}`;
        const fhResp = await rateLimitedFetch(fhUrl);
        if (!fhResp.ok) throw new Error(`HTTP ${fhResp.status}`);
        return fhResp.json();
      });

      if (fhData && typeof fhData.c === 'number' && fhData.c > 0) {
        quote = {
          symbol: upperSymbol,
          price: fhData.c,
          change: fhData.d ?? 0,
          changePercent: fhData.dp ?? 0,
          open: fhData.o ?? 0,
          high: fhData.h ?? 0,
          low: fhData.l ?? 0,
          previousClose: fhData.pc ?? 0,
          volume: 0,
          timestamp: fhData.t ? fhData.t * 1000 : Date.now(),
        };

        ohlcCandles = [{
          timestamp: fhData.t ? fhData.t * 1000 : Date.now(),
          open: fhData.o ?? fhData.c,
          high: fhData.h ?? fhData.c,
          low: fhData.l ?? fhData.c,
          close: fhData.c,
          volume: 0,
        }];

        technicals = computeTechnicalsFromOHLC(ohlcCandles, quote.price);
        priceSource = "Finnhub-Quote";
        providersUsed.push("Finnhub-Quote");
        finnSuccess = true;

        log.dataFetch(`Fallback Finnhub quote for ${upperSymbol}: $${quote.price}`, { cached: false });
      } else {
        log.providerFailure(`Finnhub returned no usable quote for ${upperSymbol}`);
      }
    } else {
      log.providerFailure("FINNHUB_API_KEY not configured for fallback");
    }

    if (!finnSuccess) {
      quote = {
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
      
      ohlcCandles = [];
      technicals = {
        rsi: 0,
        sma20: 0,
        sma50: 0,
        sma200: 0,
        ema20: 0,
        ema50: 0,
        atr: 0,
        atrPercent: 0,
      };
      
      priceSource = "Unavailable";
    }
  }

  providersUsed.push("Local-Technicals");

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
