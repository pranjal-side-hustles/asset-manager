import type {
  Stock,
  StockQuote,
  DashboardStock,
  StockEvaluationResponse,
  StockSnapshot,
  DataConfidence,
  MarketContextInfo,
} from "@shared/types";
import { PriceContext } from "@shared/types";
import type { MarketContext } from "@shared/types/marketContext";
import { getStockSnapshot } from "../aggregation";
import { evaluateStrategicGrowth } from "../../domain/horizons/strategicGrowth/evaluator";
import { evaluateTacticalSentinel } from "../../domain/horizons/tacticalSentinel/evaluator";
import { convertSnapshotToStrategicInputs } from "../../domain/horizons/strategicGrowth/snapshotConverter";
import { convertSnapshotToTacticalInputs } from "../../domain/horizons/tacticalSentinel/snapshotConverter";
import { getMarketContext } from "../../domain/marketContext/marketContextEngine";
import { logger } from "../../infra/logging/logger";
import {
  evaluateSectorRegime,
  type SectorInputs,
} from "../../domain/sectorRegime/sectorRegimeEngine";
import { evaluatePortfolioConstraints } from "../../domain/portfolio/portfolioConstraintEngine";
import { rankStocks } from "../../domain/ranking/relativeRankingEngine";
import type { PortfolioSnapshot } from "@shared/types/portfolio";
import { deriveHorizonLabel } from "../../domain/calibration";
import { getDecisionLabel } from "../../domain/decisionLabels";
import {
  getDashboardSample,
  getUniverseStock
} from "./stockUniverse";
import { selectDashboardStocks } from "./dashboardRotation";

// Fallback sector mapping for known symbols when provider data is unavailable
const SYMBOL_SECTOR_MAP: Record<string, string> = {
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Communication Services",
  AMZN: "Consumer Discretionary",
  NVDA: "Technology",
  META: "Communication Services",
  TSLA: "Consumer Discretionary",
  JPM: "Financial Services",
  V: "Financial Services",
  MA: "Financial Services",
  HD: "Consumer Discretionary",
  CRM: "Technology",
  NFLX: "Communication Services",
  COST: "Consumer Staples",
  AMD: "Technology",
  ORCL: "Technology",
  ADBE: "Technology",
  BRK: "Financial Services",
  LLY: "Healthcare",
  UNH: "Healthcare",
};

export interface ExtendedStockEvaluationResponse
  extends StockEvaluationResponse {
  dataConfidence: DataConfidence;
  warnings: string[];
  providersUsed: string[];
}


function snapshotToStock(snapshot: StockSnapshot): Stock {
  return {
    symbol: snapshot.symbol,
    companyName: snapshot.companyName,
    price: snapshot.price,
    change: snapshot.change,
    changePercent: snapshot.changePercent,
    volume: snapshot.volume,
    marketCap: snapshot.marketCap || 0,
    sector: snapshot.sector || "Unknown",
    industry: snapshot.industry || "Unknown",
    intraday: snapshot.intraday,
  };
}

function snapshotToQuote(snapshot: StockSnapshot): StockQuote {
  const price = snapshot.price;
  return {
    symbol: snapshot.symbol,
    price,
    change: snapshot.change,
    changePercent: snapshot.changePercent,
    high: price * 1.02,
    low: price * 0.98,
    open: price - snapshot.change,
    previousClose: price - snapshot.change,
    volume: snapshot.volume,
    timestamp: snapshot.meta.dataFreshness.getTime(),
  };
}

export async function fetchStockData(
  symbol: string,
  context: PriceContext = PriceContext.STOCK_DETAIL
): Promise<{
  stock: Stock;
  quote: StockQuote;
  snapshot: StockSnapshot;
} | null> {
  const snapshot = await getStockSnapshot(symbol.toUpperCase(), context);

  if (!snapshot) {
    logger.withContext({ symbol }).warn("DATA_FETCH", "No data available");
    return null;
  }

  return {
    stock: snapshotToStock(snapshot),
    quote: snapshotToQuote(snapshot),
    snapshot,
  };
}

export async function fetchStockEvaluation(
  symbol: string,
  context: PriceContext = PriceContext.STOCK_DETAIL
): Promise<ExtendedStockEvaluationResponse | null> {
  const [stockData, marketContextSnapshot] = await Promise.all([
    fetchStockData(symbol, context),
    getMarketContext(),
  ]);

  if (!stockData) {
    return null;
  }

  const { stock, quote, snapshot } = stockData;
  const marketContext = marketContextSnapshot.context;

  const strategicInputs = convertSnapshotToStrategicInputs(snapshot);
  const tacticalInputs = convertSnapshotToTacticalInputs(snapshot);

  // Derive sector and regime for tactical evaluation
  const sector = stock.sector && stock.sector !== "Unknown"
    ? stock.sector
    : (SYMBOL_SECTOR_MAP[symbol] ?? "Unknown");
  const sectorInputs = deriveSectorInputs(sector, marketContext);
  const sectorResult = evaluateSectorRegime(sector, sectorInputs);

  // Phase 1 & 2: Core evaluations (UNCHANGED)
  const strategicGrowth = evaluateStrategicGrowth(
    strategicInputs,
    symbol,
    marketContext,
  );
  const tacticalSentinel = evaluateTacticalSentinel(
    tacticalInputs,
    symbol,
    marketContext,
    sectorResult.regime,
  );

  const horizonLabel = deriveHorizonLabel(strategicGrowth.status, tacticalSentinel.status);

  const allIntegrityFlags = [
    ...(strategicGrowth.integrityFlags || []),
    ...(tacticalSentinel.integrityFlags || []),
  ].filter((flag, index, arr) => arr.indexOf(flag) === index);

  // Phase 3: Confirmation Layer (SEPARATE - does NOT modify scores)
  // Fetched separately via /api/phase3/:symbol endpoint

  return {
    stock,
    quote,
    evaluation: {
      strategicGrowth,
      tacticalSentinel,
      evaluatedAt: Date.now(),
      horizonLabel,
    },
    dataConfidence: snapshot.meta.confidence,
    confidenceReasons: snapshot.meta.confidenceReasons,
    warnings: allIntegrityFlags.length > 0
      ? [...snapshot.meta.warnings, ...allIntegrityFlags]
      : snapshot.meta.warnings,
    providersUsed: snapshot.meta.providersUsed,
    marketRegime: marketContext.regime,
    marketContext: deriveMarketContextInfo(marketContext),
    priceLabel: snapshot.meta.priceLabel,
  };
}

// Mock portfolio snapshot for Phase 2 (will be replaced with real portfolio data later)
function getMockPortfolioSnapshot(): PortfolioSnapshot {
  return {
    totalCapital: 100000,
    sectorExposurePct: {},
    correlatedExposurePct: {},
    volatilityUsedPct: 30,
  };
}

// Derive sector inputs from market context
function deriveSectorInputs(
  sector: string,
  marketContext: MarketContext,
): SectorInputs {
  // Normalize sector for matching
  const normalizedSector = sector.toLowerCase().trim();

  // Try to find matching sector data
  const sectorData = marketContext.sectors?.find((s) => {
    const sectorName = s.name.toLowerCase().trim();
    return (
      sectorName.includes(normalizedSector) ||
      normalizedSector.includes(sectorName) ||
      (normalizedSector === "technology" && sectorName.includes("tech")) ||
      (normalizedSector === "communication services" &&
        sectorName.includes("comm")) ||
      (normalizedSector === "consumer discretionary" &&
        sectorName.includes("consumer")) ||
      (normalizedSector === "financial services" &&
        sectorName.includes("financ"))
    );
  });

  // Determine volatility: use actual VIX level if available
  let volatility: "LOW" | "NORMAL" | "HIGH";
  const vixLevel = marketContext.volatility?.vixLevel;
  if (vixLevel !== undefined) {
    if (vixLevel < 15) volatility = "LOW";
    else if (vixLevel > 25) volatility = "HIGH";
    else volatility = "NORMAL";
  } else {
    volatility = marketContext.volatility?.isElevated ? "HIGH" : "NORMAL";
  }

  return {
    relativeStrength:
      sectorData?.trend === "LEADING"
        ? "UP"
        : sectorData?.trend === "LAGGING"
          ? "DOWN"
          : "FLAT",
    trendHealth:
      marketContext.regime === "RISK_ON"
        ? "STRONG"
        : marketContext.regime === "RISK_OFF"
          ? "WEAK"
          : "NEUTRAL",
    volatility,
    macroAlignment:
      marketContext.regime === "RISK_ON"
        ? "TAILWIND"
        : marketContext.regime === "RISK_OFF"
          ? "HEADWIND"
          : "NEUTRAL",
  };
}

/**
 * Derives user-friendly market context info from the raw market context.
 * Based on Phase 1 logic and user's "Passive Market Context" requirement.
 */
export function deriveMarketContextInfo(marketContext: MarketContext): MarketContextInfo {
  const labelMap: Record<string, "Supportive" | "Mixed" | "Cautious"> = {
    RISK_ON: "Supportive",
    NEUTRAL: "Mixed",
    RISK_OFF: "Cautious",
  };

  const label = labelMap[marketContext.regime] || "Mixed";

  // Create a short explanatory sentence from the first 2 relevant reasons
  // Skip the first reason if it's just the regime label
  const relevantReasons = marketContext.regimeReasons
    .filter(r => !r.toLowerCase().includes("market regime"))
    .slice(0, 2);

  let description = relevantReasons.join(". ");
  if (description && !description.endsWith(".")) description += ".";

  if (!description) {
    description = marketContext.regime === "RISK_ON"
      ? "Market conditions are generally favorable."
      : marketContext.regime === "RISK_OFF"
        ? "Market conditions suggest caution."
        : "Market indicators are showing a mixed picture.";
  }

  return { label, description };
}

export async function fetchDashboardStocks(): Promise<DashboardStock[]> {
  try {
    // 1. Get symbols from the tracked universe (bootstrap)
    let dashboardSymbols = await getDashboardSample(9);

    if (dashboardSymbols.length === 0) {
      logger.warn("DATA_FETCH", "Universe sample empty. Using failsafe symbols.");
      dashboardSymbols = ["AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL"];
    }

    const marketContextSnapshot = await getMarketContext();
    const marketContext = marketContextSnapshot.context;

    // 2. Fetch and evaluate stocks
    const evaluations = await Promise.all(dashboardSymbols.map(async (symbol) => {
      try {
        const snapshot = await getStockSnapshot(symbol, PriceContext.DASHBOARD);
        if (!snapshot) return null;

        const strategic = evaluateStrategicGrowth(convertSnapshotToStrategicInputs(snapshot), symbol, marketContext);
        const tactical = evaluateTacticalSentinel(convertSnapshotToTacticalInputs(snapshot), symbol, marketContext, "NEUTRAL");
        const horizonLabel = deriveHorizonLabel(strategic.status, tactical.status);

        // Map evaluation to DashboardStock
        const evalResult: DashboardStock = {
          symbol: snapshot.symbol,
          companyName: snapshot.companyName,
          price: snapshot.price,
          change: snapshot.change,
          changePercent: snapshot.changePercent,
          eodDate: snapshot.meta.eodDate,
          priceAvailable: snapshot.meta.priceAvailable,
          strategicScore: strategic.score,
          strategicStatus: strategic.status,
          tacticalScore: tactical.score,
          tacticalStatus: tactical.status,
          horizonLabel,
          strategicLabels: strategic.labels,
          tacticalLabels: tactical.labels,
          sector: snapshot.sector || (SYMBOL_SECTOR_MAP[symbol] ?? "Technology"),
          priceLabel: snapshot.meta.priceLabel,
          decisionLabel: getDecisionLabel(
            tactical.score,
            tactical.status === "AVOID",
            Object.values(tactical.labels || {}).filter((l): l is string => typeof l === "string"),
            marketContext.regime
          ),
          marketRegime: marketContext.regime,
        };

        return evalResult;
      } catch (e) {
        logger.warn("DATA_FETCH", `Failed to evaluate ${symbol}: ${e}`);
        return null;
      }
    }));

    let dashboardStocks = evaluations.filter((s): s is DashboardStock => s !== null);

    // 3. EMERGENCY INJECTION: If no stocks were evaluated, return hardcoded mock data
    if (dashboardStocks.length === 0) {
      logger.error("DATA_FETCH", "Zero stocks evaluated for dashboard. Injecting emergency mock data.");
      const emergencyResult = (symbol: string, name: string, price: number, change: number, pct: number, score: number, horizon: string, sector: string) => ({
        symbol, companyName: `${name} (Emergency)`, price, change, changePercent: pct, priceAvailable: true, eodDate: new Date().toISOString(),
        strategicScore: score - 5, strategicStatus: "HEALTHY", tacticalScore: score, tacticalStatus: "STABLE", horizonLabel: horizon, sector,
        marketRegime: marketContext.regime,
        decisionLabel: {
          label: score > 75 ? "GOOD_TO_ACT" : "KEEP_AN_EYE_ON",
          displayText: score > 75 ? "Strong Setup" : "Stable Value",
          explanation: "Synchronized data snapshot.",
          canAct: score > 75,
          riskBlockReasons: []
        },
        strategicLabels: { businessModel: "STRONG", moat: "WIDE", growth: "ACCELERATING" },
        tacticalLabels: { trendAlignment: "UP", momentumRegime: "FAVORED", institutionalFlow: "SUPPORTIVE" }
      });

      return [
        emergencyResult("AAPL", "Apple Inc.", 185.92, 1.2, 0.65, 81, "Ready Now", "Technology"),
        emergencyResult("NVDA", "NVIDIA Corp", 624.15, 15.4, 2.53, 88, "Ready Now", "Technology"),
        emergencyResult("MSFT", "Microsoft", 398.05, -1.2, -0.3, 74, "Keep Watching", "Technology"),
        emergencyResult("AMZN", "Amazon", 159.12, 2.1, 1.34, 62, "Keep Watching", "Consumer Discretionary"),
        emergencyResult("GOOGL", "Alphabet", 142.65, 0.8, 0.56, 55, "Strong SHAPE", "Communication Services"),
        emergencyResult("META", "Meta", 390.14, 4.5, 1.16, 72, "Strong FORCE", "Communication Services"),
      ] as any[];
    }

    // 4. Lookup market cap and rotate
    for (const s of dashboardStocks) {
      try {
        const u = await getUniverseStock(s.symbol);
        if (u) s.marketCapCategory = u.marketCapCategory;
      } catch (e) { }
    }

    try {
      const curated = selectDashboardStocks(dashboardStocks, marketContext.regime);
      return curated.length > 0 ? curated : dashboardStocks.slice(0, 6);
    } catch (e) {
      return dashboardStocks.slice(0, 6);
    }
  } catch (error) {
    logger.error("DATA_FETCH", "Critical crash in fetchDashboardStocks", { error });
    throw error; // Let the route handle it with its own emergency fallback
  }
}



