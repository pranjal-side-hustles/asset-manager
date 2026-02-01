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
    const [rsiData, sma20Data, sma50Data, sma200Data, atrData] = await Promise.all([
      this.fetch<TwelveDataIndicatorResponse>(`/rsi?symbol=${symbol}&interval=1day&time_period=14`),
      this.fetch<TwelveDataIndicatorResponse>(`/sma?symbol=${symbol}&interval=1day&time_period=20`),
      this.fetch<TwelveDataIndicatorResponse>(`/sma?symbol=${symbol}&interval=1day&time_period=50`),
      this.fetch<TwelveDataIndicatorResponse>(`/sma?symbol=${symbol}&interval=1day&time_period=200`),
      this.fetch<TwelveDataIndicatorResponse>(`/atr?symbol=${symbol}&interval=1day&time_period=14`),
    ]);

    const getLatestValue = (data: TwelveDataIndicatorResponse | null, key: string): number | undefined => {
      if (!data || !data.values || data.values.length === 0) return undefined;
      const val = data.values[0][key];
      return val ? parseFloat(val) : undefined;
    };

    const rsi = getLatestValue(rsiData, "rsi");
    const sma20 = getLatestValue(sma20Data, "sma");
    const sma50 = getLatestValue(sma50Data, "sma");
    const sma200 = getLatestValue(sma200Data, "sma");
    const atr = getLatestValue(atrData, "atr");

    if (rsi === undefined && sma20 === undefined && atr === undefined) {
      return failure(this.name, `No technical data for ${symbol}`);
    }

    const quoteResult = await this.getQuote(symbol);
    const price = quoteResult.data?.price || 0;
    const atrPercent = atr && price > 0 ? (atr / price) * 100 : undefined;

    return success<TechnicalIndicators>(
      {
        rsi,
        sma20,
        sma50,
        sma200,
        atr,
        atrPercent,
      },
      this.name
    );
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
