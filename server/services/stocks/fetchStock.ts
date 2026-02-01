import type { Stock, StockQuote, DashboardStock, StockEvaluationResponse, StockSnapshot, DataConfidence } from "@shared/types";
import type { MarketContext } from "@shared/types/marketContext";
import { getStockSnapshot } from "../aggregation";
import { evaluateStrategicGrowth } from "../../domain/horizons/strategicGrowth/evaluator";
import { evaluateTacticalSentinel } from "../../domain/horizons/tacticalSentinel/evaluator";
import { convertSnapshotToStrategicInputs } from "../../domain/horizons/strategicGrowth/snapshotConverter";
import { convertSnapshotToTacticalInputs } from "../../domain/horizons/tacticalSentinel/snapshotConverter";
import { getMarketContext } from "../../domain/marketContext/marketContextEngine";
import { logger } from "../../infra/logging/logger";

const TRACKED_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V"];

export interface ExtendedStockEvaluationResponse extends StockEvaluationResponse {
  dataConfidence: DataConfidence;
  warnings: string[];
  providersUsed: string[];
  marketRegime?: string;
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

export async function fetchStockData(symbol: string): Promise<{ stock: Stock; quote: StockQuote; snapshot: StockSnapshot } | null> {
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

export async function fetchStockEvaluation(symbol: string): Promise<ExtendedStockEvaluationResponse | null> {
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
  
  const strategicGrowth = evaluateStrategicGrowth(strategicInputs, symbol, marketContext);
  const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs, symbol, marketContext);
  
  return {
    stock,
    quote,
    evaluation: {
      strategicGrowth,
      tacticalSentinel,
      evaluatedAt: Date.now(),
    },
    dataConfidence: snapshot.meta.confidence,
    confidenceReasons: snapshot.meta.confidenceReasons,
    warnings: snapshot.meta.warnings,
    providersUsed: snapshot.meta.providersUsed,
    marketRegime: marketContext.regime,
  };
}

export async function fetchDashboardStocks(): Promise<DashboardStock[]> {
  const [results, marketContextSnapshot] = await Promise.all([
    Promise.allSettled(TRACKED_SYMBOLS.map(symbol => getStockSnapshot(symbol))),
    getMarketContext(),
  ]);
  
  const marketContext = marketContextSnapshot.context;
  const dashboardStocks: DashboardStock[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const symbol = TRACKED_SYMBOLS[i];
    
    if (result.status === "fulfilled" && result.value) {
      const snapshot = result.value;
      
      const strategicInputs = convertSnapshotToStrategicInputs(snapshot);
      const tacticalInputs = convertSnapshotToTacticalInputs(snapshot);
      
      const strategicGrowth = evaluateStrategicGrowth(strategicInputs, symbol, marketContext);
      const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs, symbol, marketContext);
      
      dashboardStocks.push({
        symbol: snapshot.symbol,
        companyName: snapshot.companyName,
        price: snapshot.price,
        change: snapshot.change,
        changePercent: snapshot.changePercent,
        strategicScore: strategicGrowth.score,
        strategicStatus: strategicGrowth.status,
        tacticalScore: tacticalSentinel.score,
        tacticalStatus: tacticalSentinel.status,
      });
    } else {
      logger.withContext({ symbol }).warn("DATA_FETCH", "Failed to fetch data for dashboard");
    }
  }
  
  return dashboardStocks;
}
