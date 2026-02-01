import { IndexState, TrendDirection, Momentum } from "../../../shared/types/marketContext";
import { logger } from "../../infra/logging/logger";
import { twelveDataProvider } from "../providers/adapter";

interface IndexConfig {
  symbol: string;
  name: string;
}

const INDEX_CONFIG: IndexConfig[] = [
  { symbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "IWM", name: "Russell 2000 ETF" },
];

async function fetchIndexQuote(config: IndexConfig): Promise<{
  price: number;
  change: number;
  changePercent: number;
  sma200: number;
  timestamp: number;
} | null> {
  if (!twelveDataProvider.isAvailable()) {
    logger.withContext({ symbol: config.symbol }).providerFailure(
      `TwelveData unavailable for index ${config.symbol}`
    );
    return null;
  }

  try {
    const quoteResult = await twelveDataProvider.getQuote(config.symbol);
    
    if (!quoteResult.success || !quoteResult.data) {
      logger.withContext({ symbol: config.symbol }).warn(
        "PROVIDER_FAILURE",
        `Failed to fetch index quote for ${config.symbol}`
      );
      return null;
    }

    const ohlcResult = await twelveDataProvider.getOHLC(config.symbol, "1day", 200);
    let sma200 = 0;
    
    if (ohlcResult.success && ohlcResult.data && ohlcResult.data.length >= 200) {
      const closes = ohlcResult.data.map(c => c.close);
      sma200 = closes.reduce((a, b) => a + b, 0) / closes.length;
    }

    logger.withContext({ symbol: config.symbol }).dataFetch("Index quote from TwelveData", {
      price: quoteResult.data.price,
      source: "TwelveData",
      timestamp: quoteResult.data.timestamp,
    });

    return {
      price: quoteResult.data.price,
      change: quoteResult.data.change,
      changePercent: quoteResult.data.changePercent,
      sma200,
      timestamp: quoteResult.data.timestamp,
    };
  } catch (error) {
    logger.withContext({ symbol: config.symbol }).error(
      "PROVIDER_FAILURE",
      `Error fetching index quote for ${config.symbol}: ${error}`
    );
    return null;
  }
}

function determineTrend(price: number, ma200: number, changePercent: number): TrendDirection {
  if (ma200 === 0) {
    if (changePercent > 0.5) return "UP";
    if (changePercent < -0.5) return "DOWN";
    return "SIDEWAYS";
  }

  const pctAboveMA = ((price - ma200) / ma200) * 100;

  if (pctAboveMA > 2 && changePercent > 0) return "UP";
  if (pctAboveMA < -2 && changePercent < 0) return "DOWN";
  return "SIDEWAYS";
}

function determineMomentum(changePercent: number, trend: TrendDirection): Momentum {
  if (trend === "UP" && changePercent > 0) return "POSITIVE";
  if (trend === "DOWN" && changePercent < 0) return "NEGATIVE";
  return "NEUTRAL";
}

export async function fetchAllIndices(): Promise<{
  indices: { spy: IndexState; qqq: IndexState; dia: IndexState; iwm: IndexState } | null;
  providersUsed: string[];
  providersFailed: string[];
}> {
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];

  const results = await Promise.all(
    INDEX_CONFIG.map(async (config) => {
      const quote = await fetchIndexQuote(config);

      if (!quote) {
        providersFailed.push(`TwelveData-${config.symbol}`);
        return null;
      }

      providersUsed.push(`TwelveData-${config.symbol}`);

      const trend = determineTrend(quote.price, quote.sma200, quote.changePercent);
      const momentum = determineMomentum(quote.changePercent, trend);

      const state: IndexState = {
        symbol: config.symbol,
        name: config.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        trend,
        above200DMA: quote.sma200 > 0 ? quote.price > quote.sma200 : quote.changePercent > 0,
        momentum,
        ma200: quote.sma200,
      };

      return { key: config.symbol.toLowerCase(), state };
    })
  );

  const validResults = results.filter((r): r is { key: string; state: IndexState } => r !== null);

  if (validResults.length < 2) {
    return { indices: null, providersUsed, providersFailed };
  }

  const indices = {
    spy: validResults.find((r) => r.key === "spy")?.state || createMockIndex("SPY", "S&P 500 ETF"),
    qqq: validResults.find((r) => r.key === "qqq")?.state || createMockIndex("QQQ", "Nasdaq 100 ETF"),
    dia: validResults.find((r) => r.key === "dia")?.state || createMockIndex("DIA", "Dow Jones ETF"),
    iwm: validResults.find((r) => r.key === "iwm")?.state || createMockIndex("IWM", "Russell 2000 ETF"),
  };

  logger.dataFetch(`Fetched ${validResults.length}/4 indices from TwelveData`, { providersUsed, providersFailed });

  return { indices, providersUsed, providersFailed };
}

function createMockIndex(symbol: string, name: string): IndexState {
  return {
    symbol,
    name,
    price: 0,
    change: 0,
    changePercent: 0,
    trend: "SIDEWAYS",
    above200DMA: true,
    momentum: "NEUTRAL",
    ma200: 0,
  };
}
