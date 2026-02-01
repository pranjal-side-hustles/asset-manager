export interface OHLCCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  ema20?: number;
  ema50?: number;
  atr?: number;
  atrPercent?: number;
}

export interface PriceQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  timestamp: number;
}

export interface FundamentalsData {
  revenueGrowthYoY: number[];
  epsGrowthYoY: number[];
  peRatio?: number;
  marketCap?: number;
}

export interface SentimentData {
  analystRating?: string;
  analystCount?: number;
  targetPrice?: number;
  insiderBuyRatio?: number;
  institutionalOwnership?: number;
}

export interface OptionsData {
  putCallRatio?: number;
  totalCallOI?: number;
  totalPutOI?: number;
}

export interface MarketDataResult<T> {
  data: T | null;
  provider: string;
  success: boolean;
  error?: string;
}

export interface MarketDataProvider {
  name: string;
  
  getQuote(symbol: string): Promise<MarketDataResult<PriceQuote>>;
  getOHLC(symbol: string, interval?: string, limit?: number): Promise<MarketDataResult<OHLCCandle[]>>;
  getTechnicals(symbol: string): Promise<MarketDataResult<TechnicalIndicators>>;
  getFundamentals(symbol: string): Promise<MarketDataResult<FundamentalsData>>;
  getSentiment(symbol: string): Promise<MarketDataResult<SentimentData>>;
  getOptions(symbol: string): Promise<MarketDataResult<OptionsData>>;
  
  isAvailable(): boolean;
}

export type ProviderPriority = 'primary' | 'secondary' | 'fallback';

export interface ProviderConfig {
  provider: MarketDataProvider;
  priority: ProviderPriority;
  capabilities: Array<'quote' | 'ohlc' | 'technicals' | 'fundamentals' | 'sentiment' | 'options'>;
}
