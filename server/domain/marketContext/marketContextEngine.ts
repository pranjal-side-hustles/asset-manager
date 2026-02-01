import {
  MarketContext,
  MarketContextSnapshot,
} from "../../../shared/types/marketContext";
import { fetchAllIndices } from "../../services/market/fetchIndices";
import { fetchMarketBreadth } from "../../services/market/fetchBreadth";
import { fetchSectorPerformance, createDefaultSectors } from "../../services/market/fetchSectors";
import { fetchVIX } from "../../services/market/fetchVolatility";
import { evaluateMarketRegime } from "./regimeEvaluator";
import { logger } from "../../infra/logging/logger";

let cachedContext: MarketContextSnapshot | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

const defaultIndices = {
  spy: { symbol: "SPY", name: "S&P 500 ETF", price: 0, change: 0, changePercent: 0, trend: "SIDEWAYS" as const, above200DMA: true, momentum: "NEUTRAL" as const, ma200: 0 },
  qqq: { symbol: "QQQ", name: "Nasdaq 100 ETF", price: 0, change: 0, changePercent: 0, trend: "SIDEWAYS" as const, above200DMA: true, momentum: "NEUTRAL" as const, ma200: 0 },
  dia: { symbol: "DIA", name: "Dow Jones ETF", price: 0, change: 0, changePercent: 0, trend: "SIDEWAYS" as const, above200DMA: true, momentum: "NEUTRAL" as const, ma200: 0 },
  iwm: { symbol: "IWM", name: "Russell 2000 ETF", price: 0, change: 0, changePercent: 0, trend: "SIDEWAYS" as const, above200DMA: true, momentum: "NEUTRAL" as const, ma200: 0 },
};

/** Fallback when market context fetch fails (e.g. missing API keys, timeout). */
export function getDefaultMarketContextSnapshot(reason?: string): MarketContextSnapshot {
  const context: MarketContext = {
    regime: "NEUTRAL",
    regimeReasons: reason ? [reason] : ["Market data unavailable – check API keys in Vercel/Railway env"],
    confidence: "LOW",
    indices: defaultIndices,
    breadth: { pctAbove200DMA: 50, advanceDeclineRatio: 1, newHighsLowsRatio: 1, health: "NEUTRAL" },
    sectors: createDefaultSectors(),
    volatility: { vixLevel: 18, vixTrend: "SIDEWAYS", isElevated: false },
    evaluatedAt: new Date(),
    dataFreshness: new Date(),
  };
  return {
    context,
    meta: {
      providersUsed: [],
      providersFailed: ["Finnhub", "Marketstack", "FMP"],
      warnings: [reason || "Market context unavailable. Set FINNHUB_API_KEY, MARKETSTACK_API_KEY, FMP_API_KEY in Environment Variables."],
      cacheHit: false,
    },
  };
}

export async function getMarketContext(forceRefresh = false): Promise<MarketContextSnapshot> {
  const now = Date.now();
  
  if (!forceRefresh && cachedContext && (now - cacheTimestamp) < CACHE_TTL_MS) {
    logger.cacheHit(`Market context cache hit (age: ${Math.round((now - cacheTimestamp) / 1000)}s)`);
    
    return {
      ...cachedContext,
      meta: {
        ...cachedContext.meta,
        cacheHit: true,
      },
    };
  }

  logger.cacheMiss("Fetching fresh market context");

  try {
    return await getMarketContextInternal(now);
  } catch (error) {
    logger.error("DATA_FETCH", "Market context fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return getDefaultMarketContextSnapshot(
      error instanceof Error ? error.message : "Market data fetch failed"
    );
  }
}

async function getMarketContextInternal(now: number): Promise<MarketContextSnapshot> {
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];
  const warnings: string[] = [];

  const [indicesResult, vixResult] = await Promise.all([
    fetchAllIndices(),
    fetchVIX(),
  ]);

  providersUsed.push(...indicesResult.providersUsed);
  providersFailed.push(...indicesResult.providersFailed);

  if (!indicesResult.indices) {
    warnings.push("Index data unavailable - using defaults");
  }

  const indices = indicesResult.indices || defaultIndices;

  const breadthResult = await fetchMarketBreadth({
    spy: indices.spy.changePercent,
    qqq: indices.qqq.changePercent,
    iwm: indices.iwm.changePercent,
  });

  providersUsed.push(...breadthResult.providersUsed);
  providersFailed.push(...breadthResult.providersFailed);

  if (breadthResult.isEstimated) {
    warnings.push("Breadth data estimated from index performance");
  }

  const sectorsResult = await fetchSectorPerformance(indices.spy.changePercent);

  providersUsed.push(...sectorsResult.providersUsed);
  providersFailed.push(...sectorsResult.providersFailed);

  const sectors = sectorsResult.sectors.length > 0 ? sectorsResult.sectors : createDefaultSectors();

  if (sectorsResult.sectors.length === 0) {
    warnings.push("Sector data unavailable - using defaults");
  }

  if (!vixResult.success) {
    warnings.push("VIX data unavailable - using default volatility");
    providersFailed.push("Finnhub-VIX");
  } else {
    providersUsed.push("Finnhub-VIX");
  }

  const regimeResult = evaluateMarketRegime({
    indices,
    breadth: breadthResult.breadth,
    volatility: vixResult.volatility,
  });

  const context: MarketContext = {
    regime: regimeResult.regime,
    regimeReasons: regimeResult.reasons,
    confidence: regimeResult.confidence,
    indices,
    breadth: breadthResult.breadth,
    sectors,
    volatility: vixResult.volatility,
    evaluatedAt: new Date(),
    dataFreshness: new Date(),
  };

  const snapshot: MarketContextSnapshot = {
    context,
    meta: {
      providersUsed: Array.from(new Set(providersUsed)),
      providersFailed: Array.from(new Set(providersFailed)),
      warnings,
      cacheHit: false,
    },
  };

  cachedContext = snapshot;
  cacheTimestamp = now;

  logger.engineEvaluation(
    `Market context evaluated: ${regimeResult.regime} (${regimeResult.confidence} confidence)`,
    {
      providersUsed: providersUsed.length,
      providersFailed: providersFailed.length,
      warnings: warnings.length,
    }
  );

  return snapshot;
}

export function invalidateMarketContextCache(): void {
  cachedContext = null;
  cacheTimestamp = 0;
  logger.scheduler("Market context cache invalidated");
}
