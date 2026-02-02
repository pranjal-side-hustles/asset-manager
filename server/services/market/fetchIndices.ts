import { IndexState, TrendDirection, Momentum } from "../../../shared/types/marketContext";
import { logger } from "../../infra/logging/logger";
import { fetchMarketstackEOD, isMarketstackAvailable } from "../providers/marketstack";
import { getBenchmarkPrice, INDEX_DEFAULTS } from "../aggregation/mockFallback";

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
  date: string;
} | null> {
  if (!isMarketstackAvailable()) {
    logger.withContext({ symbol: config.symbol }).providerFailure(
      `Marketstack unavailable for index ${config.symbol}`
    );
    return null;
  }

  try {
    const result = await fetchMarketstackEOD(config.symbol);

    if (!result.success || !result.data) {
      logger.withContext({ symbol: config.symbol }).warn(
        "PROVIDER_FAILURE",
        `Failed to fetch index EOD for ${config.symbol}`
      );
      return null;
    }

    const { eod, ohlc } = result.data;

    let sma200 = 0;
    if (ohlc.length >= 200) {
      const closes = ohlc.slice(0, 200).map(c => c.close);
      sma200 = closes.reduce((a, b) => a + b, 0) / closes.length;
    }

    const benchmark = getBenchmarkPrice(config.symbol);
    // Indices are less volatile than stocks, so 15% is a generous sanity threshold
    if (benchmark && (Math.abs(eod.close - benchmark) / benchmark > 0.15)) {
      logger.withContext({ symbol: config.symbol }).warn(
        "DATA_FETCH",
        `Suspicious index price for ${config.symbol}: $${eod.close} (Benchmark: $${benchmark}). Rejecting.`
      );
      return null;
    }

    logger.withContext({ symbol: config.symbol }).dataFetch("Index EOD from Marketstack", {
      price: eod.close,
      date: eod.date,
      cached: result.cached,
    });

    return {
      price: eod.close,
      change: eod.change,
      changePercent: eod.changePercent,
      sma200,
      date: eod.date,
    };
  } catch (error) {
    logger.withContext({ symbol: config.symbol }).error(
      "PROVIDER_FAILURE",
      `Error fetching index EOD for ${config.symbol}: ${error}`
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
        providersFailed.push(`Marketstack-${config.symbol}`);
        return null;
      }

      providersUsed.push(`Marketstack-${config.symbol}`);

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
    spy: results.find((r) => r?.key === "spy")?.state || INDEX_DEFAULTS.spy,
    qqq: results.find((r) => r?.key === "qqq")?.state || INDEX_DEFAULTS.qqq,
    dia: results.find((r) => r?.key === "dia")?.state || INDEX_DEFAULTS.dia,
    iwm: results.find((r) => r?.key === "iwm")?.state || INDEX_DEFAULTS.iwm,
  };

  logger.dataFetch(`Fetched ${validResults.length}/4 indices from Marketstack (EOD)`, { providersUsed, providersFailed });

  return { indices, providersUsed, providersFailed };
}
