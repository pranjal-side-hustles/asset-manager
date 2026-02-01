import type {
  Stock,
  StockQuote,
  DashboardStock,
  StockEvaluationResponse,
  StockSnapshot,
  DataConfidence,
} from "@shared/types";
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

const TRACKED_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "JPM",
  "V",
];

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
  };
}

function snapshotToQuote(snapshot: StockSnapshot): StockQuote {
  return {
    symbol: snapshot.symbol,
    price: snapshot.price,
    change: snapshot.change,
    changePercent: snapshot.changePercent,
    high: snapshot.price * 1.02,
    low: snapshot.price * 0.98,
    open: snapshot.price - snapshot.change,
    previousClose: snapshot.price - snapshot.change,
    volume: snapshot.volume,
    timestamp: snapshot.meta.dataFreshness.getTime(),
  };
}

export async function fetchStockData(
  symbol: string,
): Promise<{
  stock: Stock;
  quote: StockQuote;
  snapshot: StockSnapshot;
} | null> {
  const snapshot = await getStockSnapshot(symbol.toUpperCase());

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
): Promise<ExtendedStockEvaluationResponse | null> {
  const [stockData, marketContextSnapshot] = await Promise.all([
    fetchStockData(symbol),
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

export async function fetchDashboardStocks(): Promise<DashboardStock[]> {
  // PRIORITY: Fetch stocks FIRST before market context
  // With 100 calls/month quota, stocks take priority over indices/sectors
  // Fetch stocks SEQUENTIALLY to avoid quota race conditions
  const results: PromiseSettledResult<StockSnapshot | null>[] = [];
  for (const symbol of TRACKED_SYMBOLS) {
    try {
      const snapshot = await getStockSnapshot(symbol);
      results.push({ status: "fulfilled", value: snapshot });
    } catch (error) {
      results.push({ status: "rejected", reason: error });
    }
  }

  // Fetch market context AFTER stocks (indices/sectors are lower priority)
  const marketContextSnapshot = await getMarketContext();

  const marketContext = marketContextSnapshot.context;
  const portfolio = getMockPortfolioSnapshot();

  // First pass: evaluate all stocks
  const evaluatedStocks: Array<{
    snapshot: StockSnapshot;
    strategicGrowth: ReturnType<typeof evaluateStrategicGrowth>;
    tacticalSentinel: ReturnType<typeof evaluateTacticalSentinel>;
    sector: string;
    sectorRegime: "FAVORED" | "NEUTRAL" | "AVOID";
    portfolioAction: "ALLOW" | "REDUCE" | "BLOCK";
  }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const symbol = TRACKED_SYMBOLS[i];

    if (result.status === "fulfilled" && result.value) {
      const snapshot = result.value;
      // Use snapshot sector if available, otherwise fallback to known mapping
      const sector =
        snapshot.sector && snapshot.sector !== "Unknown"
          ? snapshot.sector
          : (SYMBOL_SECTOR_MAP[symbol] ?? null);

      const strategicInputs = convertSnapshotToStrategicInputs(snapshot);
      const tacticalInputs = convertSnapshotToTacticalInputs(snapshot);

      // Phase 2: Sector regime evaluation (computed first to pass to tactical evaluator)
      const sectorInputs = deriveSectorInputs(sector, marketContext);
      const sectorResult = evaluateSectorRegime(sector, sectorInputs);

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

      // Phase 2: Portfolio constraints
      const constraintResult = evaluatePortfolioConstraints(portfolio, {
        sector,
        sectorRegime: sectorResult.regime,
        expectedVolatilityPct: Math.abs(snapshot.changePercent) || 2,
      });

      evaluatedStocks.push({
        snapshot,
        strategicGrowth,
        tacticalSentinel,
        sector,
        sectorRegime: sectorResult.regime,
        portfolioAction: constraintResult.action,
      });
    } else {
      logger
        .withContext({ symbol })
        .warn("DATA_FETCH", "Failed to fetch data for dashboard");
    }
  }

  // Phase 2: Rank stocks
  const rankingInputs = evaluatedStocks.map((s) => ({
    symbol: s.snapshot.symbol,
    sector: s.sector,
    strategicScore: s.strategicGrowth.score,
    tacticalScore: s.tacticalSentinel.score,
    strategicStatus: s.strategicGrowth.status,
    tacticalStatus: s.tacticalSentinel.status,
    sectorRegime: s.sectorRegime,
    portfolioAction: s.portfolioAction,
  }));

  const rankedStocks = rankStocks(rankingInputs);

  // Build final dashboard stocks with Phase 2 data and calibration labels
  const dashboardStocks: DashboardStock[] = evaluatedStocks.map((s) => {
    const ranked = rankedStocks.find((r) => r.symbol === s.snapshot.symbol);
    const horizonLabel = deriveHorizonLabel(s.strategicGrowth.status, s.tacticalSentinel.status);

    const allIntegrityFlags = [
      ...(s.strategicGrowth.integrityFlags || []),
      ...(s.tacticalSentinel.integrityFlags || []),
    ].filter((flag, index, arr) => arr.indexOf(flag) === index);

    return {
      symbol: s.snapshot.symbol,
      companyName: s.snapshot.companyName,
      price: s.snapshot.price,
      change: s.snapshot.change,
      changePercent: s.snapshot.changePercent,
      eodDate: s.snapshot.meta.eodDate,
      priceAvailable: s.snapshot.meta.priceAvailable,
      strategicScore: s.strategicGrowth.score,
      strategicStatus: s.strategicGrowth.status,
      tacticalScore: s.tacticalSentinel.score,
      tacticalStatus: s.tacticalSentinel.status,
      horizonLabel,
      strategicLabels: s.strategicGrowth.labels,
      tacticalLabels: s.tacticalSentinel.labels,
      integrityFlags: allIntegrityFlags.length > 0 ? allIntegrityFlags : undefined,
      // Phase 2 fields
      sector: s.sector,
      sectorRegime: s.sectorRegime,
      portfolioAction: s.portfolioAction,
      capitalPriority: ranked?.capitalPriority || "WATCH",
      rankInSector: ranked?.rankInSector,
      phase2Reasons: ranked?.reasons,
      // Phase 2 lockdown fields
      decisionLabel: getDecisionLabel(
        s.tacticalSentinel.score,
        s.portfolioAction !== "ALLOW" || s.sectorRegime === "AVOID",
        ranked?.reasons || [],
        marketContext.regime
      ),
      marketRegime: marketContext.regime,
      businessQualitySignals: {
        fundamentals: s.strategicGrowth.details.fundamentalAcceleration.status,
        institutional: s.strategicGrowth.details.institutionalSignals.status,
        macro: s.strategicGrowth.details.macroAlignment.status,
      },
      marketTimingSignals: {
        technical: s.tacticalSentinel.details.technicalAlignment.status,
        momentum: s.tacticalSentinel.details.momentumRegime.status,
        sector: s.sectorRegime === "FAVORED" ? "pass" : s.sectorRegime === "AVOID" ? "fail" : "caution",
        event: s.tacticalSentinel.details.eventProximity.status,
      },
      sentimentScore: s.tacticalSentinel.details.sentimentContext.score,
    };
  });

  return dashboardStocks;
}
