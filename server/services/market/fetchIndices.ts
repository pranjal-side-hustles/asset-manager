import { IndexState, TrendDirection, Momentum } from "../../../shared/types/marketContext";
import { fetchWithRetry } from "../../infra/network/fetchWithRetry";
import { providerGuard } from "../../infra/network/providerGuard";
import { logger } from "../../infra/logging/logger";

interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

interface IndexConfig {
  symbol: string;
  finnhubSymbol: string;
  name: string;
}

const INDEX_CONFIG: IndexConfig[] = [
  { symbol: "SPY", finnhubSymbol: "SPY", name: "S&P 500 ETF" },
  { symbol: "QQQ", finnhubSymbol: "QQQ", name: "Nasdaq 100 ETF" },
  { symbol: "DIA", finnhubSymbol: "DIA", name: "Dow Jones ETF" },
  { symbol: "IWM", finnhubSymbol: "IWM", name: "Russell 2000 ETF" },
];

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

async function fetchIndexQuote(config: IndexConfig): Promise<{ price: number; change: number; changePercent: number } | null> {
  if (!providerGuard.isAvailable("Finnhub")) {
    logger.withContext({ symbol: config.symbol }).warn(
      "PROVIDER_FAILURE",
      `Finnhub unavailable for index ${config.symbol}`
    );
    return null;
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${config.finnhubSymbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 8000 });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: FinnhubQuote = await response.json();
    
    if (!data.c || data.c === 0) {
      return null;
    }

    providerGuard.recordSuccess("Finnhub");
    
    return {
      price: data.c,
      change: data.d || 0,
      changePercent: data.dp || 0,
    };
  } catch (error) {
    providerGuard.recordFailure("Finnhub");
    logger.withContext({ symbol: config.symbol }).error(
      "PROVIDER_FAILURE",
      `Failed to fetch index quote for ${config.symbol}: ${error}`
    );
    return null;
  }
}

async function fetchMA200(symbol: string): Promise<number | null> {
  const FMP_API_KEY = process.env.FMP_API_KEY;
  
  if (!FMP_API_KEY || !providerGuard.isAvailable("FMP")) {
    return null;
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/technical_indicator/daily/${symbol}?type=sma&period=200&apikey=${FMP_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 8000 });
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0 && data[0].sma) {
      providerGuard.recordSuccess("FMP");
      return data[0].sma;
    }
    
    return null;
  } catch (error) {
    providerGuard.recordFailure("FMP");
    return null;
  }
}

function determineTrend(price: number, ma200: number | null, changePercent: number): TrendDirection {
  if (!ma200) {
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
      const [quote, ma200] = await Promise.all([
        fetchIndexQuote(config),
        fetchMA200(config.symbol),
      ]);

      if (!quote) {
        providersFailed.push(`Finnhub-${config.symbol}`);
        return null;
      }

      providersUsed.push(`Finnhub-${config.symbol}`);
      if (ma200) providersUsed.push(`FMP-MA200-${config.symbol}`);

      const trend = determineTrend(quote.price, ma200, quote.changePercent);
      const momentum = determineMomentum(quote.changePercent, trend);

      const state: IndexState = {
        symbol: config.symbol,
        name: config.name,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        trend,
        above200DMA: ma200 ? quote.price > ma200 : quote.changePercent > 0,
        momentum,
        ma200: ma200 || 0,
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

  logger.dataFetch(`Fetched ${validResults.length}/4 indices successfully`, { providersUsed, providersFailed });

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
