import type {
  MarketDataProvider,
  MarketDataResult,
  PriceQuote,
  OHLCCandle,
  TechnicalIndicators,
  FundamentalsData,
  SentimentData,
  OptionsData,
} from "./types";

const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  open: string;
  high: string;
  low: string;
  close: string;
  previous_close: string;
  change: string;
  percent_change: string;
  volume: string;
  timestamp: number;
}

interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
  status: string;
}

interface TwelveDataIndicatorResponse {
  meta: {
    symbol: string;
    interval: string;
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
  status: string;
}

function success<T>(data: T, provider: string): MarketDataResult<T> {
  return { data, provider, success: true };
}

function failure<T>(provider: string, error: string): MarketDataResult<T> {
  console.warn(`[${provider}] ${error}`);
  return { data: null, provider, success: false, error };
}

export class TwelveDataProvider implements MarketDataProvider {
  name = "TwelveData";
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.TWELVE_DATA_API_KEY;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T | null> {
    if (!this.apiKey) {
      return null;
    }

    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${TWELVE_DATA_BASE_URL}${endpoint}${separator}apikey=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[TwelveData] HTTP ${response.status} for ${endpoint}`);
        return null;
      }

      const data = await response.json();
      
      if (data.status === "error" || data.code) {
        console.warn(`[TwelveData] API error: ${data.message || data.code}`);
        return null;
      }

      return data as T;
    } catch (error) {
      console.warn(`[TwelveData] Fetch error:`, error);
      return null;
    }
  }

  async getQuote(symbol: string): Promise<MarketDataResult<PriceQuote>> {
    const data = await this.fetch<TwelveDataQuoteResponse>(`/quote?symbol=${symbol}`);

    if (!data || !data.close) {
      return failure(this.name, `No quote data for ${symbol}`);
    }

    return success<PriceQuote>(
      {
        symbol: data.symbol || symbol,
        price: parseFloat(data.close),
        change: parseFloat(data.change || "0"),
        changePercent: parseFloat(data.percent_change || "0"),
        open: parseFloat(data.open || "0"),
        high: parseFloat(data.high || "0"),
        low: parseFloat(data.low || "0"),
        previousClose: parseFloat(data.previous_close || "0"),
        volume: parseInt(data.volume || "0", 10),
        timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
      },
      this.name
    );
  }

  async getOHLC(
    symbol: string,
    interval: string = "1day",
    limit: number = 100
  ): Promise<MarketDataResult<OHLCCandle[]>> {
    const data = await this.fetch<TwelveDataTimeSeriesResponse>(
      `/time_series?symbol=${symbol}&interval=${interval}&outputsize=${limit}`
    );

    if (!data || !data.values || data.values.length === 0) {
      return failure(this.name, `No OHLC data for ${symbol}`);
    }

    const candles: OHLCCandle[] = data.values.map((v) => ({
      timestamp: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume || "0", 10),
    }));

    return success(candles, this.name);
  }

  async getTechnicals(symbol: string): Promise<MarketDataResult<TechnicalIndicators>> {
    return failure(this.name, "Use computeTechnicalsFromOHLC instead");
  }

  computeTechnicalsFromOHLC(ohlc: OHLCCandle[], currentPrice: number): TechnicalIndicators {
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

  async getFundamentals(_symbol: string): Promise<MarketDataResult<FundamentalsData>> {
    return failure(this.name, "Fundamentals not supported - use MockProvider");
  }

  async getSentiment(_symbol: string): Promise<MarketDataResult<SentimentData>> {
    return failure(this.name, "Sentiment not supported - use MockProvider");
  }

  async getOptions(_symbol: string): Promise<MarketDataResult<OptionsData>> {
    return failure(this.name, "Options not supported - use MockProvider");
  }
}

export const twelveDataProvider = new TwelveDataProvider();
