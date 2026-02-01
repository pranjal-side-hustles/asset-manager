export interface Stock {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  industry: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: number;
}

export interface StockSummary {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
}

export type InstitutionalTrend = "INCREASING" | "FLAT" | "DECREASING";
export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface StockFundamentals {
  revenueGrowthYoY: number[];
  epsGrowthYoY: number[];
  peRatio?: number;
  forwardPE?: number;
  priceToBook?: number;
  debtToEquity?: number;
  freeCashFlowYield?: number;
}

export interface StockTechnicals {
  atr: number;
  atrPercent: number;
  rsi: number;
  movingAverages: {
    ma20: number;
    ma50: number;
    ma200: number;
  };
  priceVsMA50: number;
  priceVsMA200: number;
  weeklyTrend: "UP" | "DOWN" | "SIDEWAYS";
  dailyTrend: "UP" | "DOWN" | "SIDEWAYS";
}

export interface StockSentiment {
  putCallRatio?: number;
  shortInterest?: number;
  shortInterestDaysTocover?: number;
  institutionalOwnership?: number;
  institutionalTrend?: InstitutionalTrend;
  insiderBuying?: boolean;
  analystRating?: number;
  analystPriceTarget?: number;
}

export interface StockOptions {
  impliedVolatility?: number;
  ivRank?: number;
  totalOpenInterest?: number;
  callOpenInterest?: number;
  putOpenInterest?: number;
  gammaExposure?: number;
}

export interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSnapshotMeta {
  dataFreshness: Date;
  eodDate?: string;
  priceAvailable: boolean;
  providersUsed: string[];
  providersFailed: string[];
  confidence: DataConfidence;
  confidenceScore?: number;
  confidenceReasons?: string[];
  warnings: string[];
}

export interface StockSnapshot {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  sector?: string;
  industry?: string;

  fundamentals: StockFundamentals;
  technicals: StockTechnicals;
  sentiment: StockSentiment;
  options: StockOptions;
  historicalPrices: HistoricalPrice[];

  meta: StockSnapshotMeta;
}

export interface PartialStockData {
  price?: {
    symbol: string;
    companyName: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
    sector?: string;
    industry?: string;
    high?: number;
    low?: number;
    open?: number;
    previousClose?: number;
  };
  fundamentals?: Partial<StockFundamentals>;
  technicals?: Partial<StockTechnicals>;
  sentiment?: Partial<StockSentiment>;
  options?: Partial<StockOptions>;
  historicalPrices?: HistoricalPrice[];
}
