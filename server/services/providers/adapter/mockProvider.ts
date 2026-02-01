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

function success<T>(data: T, provider: string): MarketDataResult<T> {
  return { data, provider, success: true };
}

interface MockStockData {
  symbol: string;
  companyName: string;
  basePrice: number;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  revenueGrowth: number[];
  epsGrowth: number[];
}

const MOCK_STOCKS: Record<string, MockStockData> = {
  AAPL: {
    symbol: "AAPL",
    companyName: "Apple Inc.",
    basePrice: 192.50,
    sector: "Technology",
    industry: "Consumer Electronics",
    marketCap: 2950000000000,
    peRatio: 31.2,
    revenueGrowth: [8.1, 5.5, 2.1, -2.5],
    epsGrowth: [12.5, 8.2, 4.1, -1.2],
  },
  MSFT: {
    symbol: "MSFT",
    companyName: "Microsoft Corporation",
    basePrice: 425.00,
    sector: "Technology",
    industry: "Software",
    marketCap: 3150000000000,
    peRatio: 36.5,
    revenueGrowth: [12.8, 10.5, 7.2, 6.1],
    epsGrowth: [18.2, 15.1, 12.8, 9.5],
  },
  GOOGL: {
    symbol: "GOOGL",
    companyName: "Alphabet Inc.",
    basePrice: 178.00,
    sector: "Communication Services",
    industry: "Internet Content",
    marketCap: 2200000000000,
    peRatio: 26.5,
    revenueGrowth: [9.5, 8.2, 6.1, 3.8],
    epsGrowth: [14.2, 11.5, 8.8, 5.2],
  },
  AMZN: {
    symbol: "AMZN",
    companyName: "Amazon.com Inc.",
    basePrice: 205.00,
    sector: "Consumer Discretionary",
    industry: "E-Commerce",
    marketCap: 2150000000000,
    peRatio: 58.2,
    revenueGrowth: [11.8, 9.2, 7.5, 12.1],
    epsGrowth: [85.2, 42.1, 28.5, 15.8],
  },
  NVDA: {
    symbol: "NVDA",
    companyName: "NVIDIA Corporation",
    basePrice: 138.50,
    sector: "Technology",
    industry: "Semiconductors",
    marketCap: 3400000000000,
    peRatio: 58.5,
    revenueGrowth: [122.5, 88.2, 56.1, 28.5],
    epsGrowth: [185.2, 125.1, 82.5, 45.8],
  },
  META: {
    symbol: "META",
    companyName: "Meta Platforms Inc.",
    basePrice: 595.00,
    sector: "Communication Services",
    industry: "Social Media",
    marketCap: 1520000000000,
    peRatio: 28.8,
    revenueGrowth: [22.5, 18.2, 12.1, 8.5],
    epsGrowth: [75.2, 55.1, 32.5, 18.8],
  },
  TSLA: {
    symbol: "TSLA",
    companyName: "Tesla Inc.",
    basePrice: 395.00,
    sector: "Consumer Discretionary",
    industry: "Automotive",
    marketCap: 1270000000000,
    peRatio: 185.0,
    revenueGrowth: [18.8, 24.5, 37.2, 51.1],
    epsGrowth: [28.5, 42.1, 68.2, 95.8],
  },
  JPM: {
    symbol: "JPM",
    companyName: "JPMorgan Chase & Co.",
    basePrice: 245.00,
    sector: "Financial Services",
    industry: "Banking",
    marketCap: 700000000000,
    peRatio: 12.8,
    revenueGrowth: [8.2, 12.5, 6.1, 4.8],
    epsGrowth: [12.5, 18.2, 8.1, 5.2],
  },
  V: {
    symbol: "V",
    companyName: "Visa Inc.",
    basePrice: 315.00,
    sector: "Financial Services",
    industry: "Payment Processing",
    marketCap: 580000000000,
    peRatio: 30.5,
    revenueGrowth: [11.2, 9.8, 8.5, 7.2],
    epsGrowth: [15.8, 12.5, 10.2, 8.8],
  },
};

function getDefaultMockData(symbol: string): MockStockData {
  return {
    symbol,
    companyName: `${symbol} Inc.`,
    basePrice: 100 + Math.random() * 200,
    sector: "Technology",
    industry: "Unknown",
    marketCap: 50000000000,
    peRatio: 25,
    revenueGrowth: [5, 4, 3, 2],
    epsGrowth: [8, 6, 4, 2],
  };
}

function addVariation(base: number, percent: number = 2): number {
  const variation = (Math.random() - 0.5) * 2 * (percent / 100);
  return base * (1 + variation);
}

export class MockProvider implements MarketDataProvider {
  name = "Mock";
  private ohlcCache: Map<string, OHLCCandle[]> = new Map();

  isAvailable(): boolean {
    return true;
  }

  private getMockData(symbol: string): MockStockData {
    return MOCK_STOCKS[symbol.toUpperCase()] || getDefaultMockData(symbol);
  }

  private generateOHLC(symbol: string): OHLCCandle[] {
    const cached = this.ohlcCache.get(symbol.toUpperCase());
    if (cached) return cached;

    const mock = this.getMockData(symbol);
    const limit = 100;
    const candles: OHLCCandle[] = [];
    
    let currentPrice = mock.basePrice * 0.90;

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = Date.now() - i * 24 * 60 * 60 * 1000;
      const dailyChange = (Math.random() - 0.48) * currentPrice * 0.022;
      
      const open = currentPrice;
      const close = currentPrice + dailyChange;
      const high = Math.max(open, close) * (1 + Math.random() * 0.012);
      const low = Math.min(open, close) * (1 - Math.random() * 0.012);

      candles.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.floor(5000000 + Math.random() * 30000000),
      });

      currentPrice = close;
    }

    this.ohlcCache.set(symbol.toUpperCase(), candles);
    
    setTimeout(() => {
      this.ohlcCache.delete(symbol.toUpperCase());
    }, 120000);

    return candles;
  }

  async getQuote(symbol: string): Promise<MarketDataResult<PriceQuote>> {
    const mock = this.getMockData(symbol);
    const price = mock.basePrice;
    const change = parseFloat(((Math.random() - 0.5) * price * 0.03).toFixed(2));
    const changePercent = parseFloat(((change / (price - change)) * 100).toFixed(2));

    return success<PriceQuote>(
      {
        symbol: mock.symbol,
        price,
        change,
        changePercent,
        open: parseFloat((price - change * 0.5).toFixed(2)),
        high: parseFloat((price * 1.012).toFixed(2)),
        low: parseFloat((price * 0.988).toFixed(2)),
        previousClose: parseFloat((price - change).toFixed(2)),
        volume: Math.floor(10000000 + Math.random() * 50000000),
        timestamp: Date.now(),
      },
      this.name
    );
  }

  async getOHLC(
    symbol: string,
    _interval: string = "1day",
    limit: number = 100
  ): Promise<MarketDataResult<OHLCCandle[]>> {
    const ohlc = this.generateOHLC(symbol);
    return success(ohlc.slice(-limit), this.name);
  }

  async getTechnicals(symbol: string): Promise<MarketDataResult<TechnicalIndicators>> {
    const mock = this.getMockData(symbol);
    const price = mock.basePrice;
    const ohlc = this.generateOHLC(symbol);

    const closes = ohlc.map(c => c.close);
    const sma20 = closes.length >= 20 
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : price * 0.98;
    const sma50 = closes.length >= 50 
      ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 
      : price * 0.95;
    const sma200 = closes.length >= 100 
      ? closes.slice(-100).reduce((a, b) => a + b, 0) / 100 
      : price * 0.90;

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
      : price * 0.02;

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

    return success<TechnicalIndicators>(
      {
        rsi: parseFloat(Math.min(75, Math.max(25, rsi)).toFixed(2)),
        sma20: parseFloat(sma20.toFixed(2)),
        sma50: parseFloat(sma50.toFixed(2)),
        sma200: parseFloat(sma200.toFixed(2)),
        ema20: parseFloat((sma20 * 1.002).toFixed(2)),
        ema50: parseFloat((sma50 * 1.001).toFixed(2)),
        atr: parseFloat(atr.toFixed(2)),
        atrPercent: parseFloat(((atr / price) * 100).toFixed(2)),
      },
      this.name
    );
  }

  async getFundamentals(symbol: string): Promise<MarketDataResult<FundamentalsData>> {
    const mock = this.getMockData(symbol);

    return success<FundamentalsData>(
      {
        revenueGrowthYoY: mock.revenueGrowth,
        epsGrowthYoY: mock.epsGrowth,
        peRatio: mock.peRatio,
        marketCap: mock.marketCap,
      },
      this.name
    );
  }

  async getSentiment(symbol: string): Promise<MarketDataResult<SentimentData>> {
    const mock = this.getMockData(symbol);
    const ratings = ["Strong Buy", "Buy", "Hold", "Sell"];
    const ratingIndex = Math.floor(Math.random() * 3);

    return success<SentimentData>(
      {
        analystRating: ratings[ratingIndex],
        analystCount: 15 + Math.floor(Math.random() * 25),
        targetPrice: parseFloat((mock.basePrice * (1.1 + Math.random() * 0.3)).toFixed(2)),
        insiderBuyRatio: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
        institutionalOwnership: parseFloat((60 + Math.random() * 30).toFixed(2)),
      },
      this.name
    );
  }

  async getOptions(symbol: string): Promise<MarketDataResult<OptionsData>> {
    const _mock = this.getMockData(symbol);
    const putCallRatio = 0.6 + Math.random() * 0.8;

    return success<OptionsData>(
      {
        putCallRatio: parseFloat(putCallRatio.toFixed(2)),
        totalCallOI: Math.floor(500000 + Math.random() * 2000000),
        totalPutOI: Math.floor(300000 + Math.random() * 1500000),
      },
      this.name
    );
  }
}

export const mockProvider = new MockProvider();
