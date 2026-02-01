import type { Stock, StockQuote, DashboardStock, StockEvaluationResponse, StockSnapshot, DataConfidence } from "@shared/types";
import { getStockSnapshot } from "../aggregation";
import { evaluateStrategicGrowth } from "../../domain/horizons/strategicGrowth/evaluator";
import { evaluateTacticalSentinel } from "../../domain/horizons/tacticalSentinel/evaluator";
import { convertSnapshotToStrategicInputs } from "../../domain/horizons/strategicGrowth/snapshotConverter";
import { convertSnapshotToTacticalInputs } from "../../domain/horizons/tacticalSentinel/snapshotConverter";

const TRACKED_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "V"];

export interface ExtendedStockEvaluationResponse extends StockEvaluationResponse {
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

export async function fetchStockData(symbol: string): Promise<{ stock: Stock; quote: StockQuote; snapshot: StockSnapshot } | null> {
  const snapshot = await getStockSnapshot(symbol.toUpperCase());
  
  if (!snapshot) {
    console.warn(`[fetchStockData] No data available for ${symbol}`);
    return null;
  }
  
  return {
    stock: snapshotToStock(snapshot),
    quote: snapshotToQuote(snapshot),
    snapshot,
  };
}

export async function fetchStockEvaluation(symbol: string): Promise<ExtendedStockEvaluationResponse | null> {
  const stockData = await fetchStockData(symbol);
  
  if (!stockData) {
    return null;
  }
  
  const { stock, quote, snapshot } = stockData;
  
  const strategicInputs = convertSnapshotToStrategicInputs(snapshot);
  const tacticalInputs = convertSnapshotToTacticalInputs(snapshot);
  
  const strategicGrowth = evaluateStrategicGrowth(strategicInputs);
  const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs);
  
  return {
    stock,
    quote,
    evaluation: {
      strategicGrowth,
      tacticalSentinel,
      evaluatedAt: Date.now(),
    },
    dataConfidence: snapshot.meta.confidence,
    warnings: snapshot.meta.warnings,
    providersUsed: snapshot.meta.providersUsed,
  };
}

export async function fetchDashboardStocks(): Promise<DashboardStock[]> {
  const results = await Promise.allSettled(
    TRACKED_SYMBOLS.map(symbol => getStockSnapshot(symbol))
  );
  
  const dashboardStocks: DashboardStock[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const symbol = TRACKED_SYMBOLS[i];
    
    if (result.status === "fulfilled" && result.value) {
      const snapshot = result.value;
      
      const strategicInputs = convertSnapshotToStrategicInputs(snapshot);
      const tacticalInputs = convertSnapshotToTacticalInputs(snapshot);
      
      const strategicGrowth = evaluateStrategicGrowth(strategicInputs);
      const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs);
      
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
      console.warn(`[Dashboard] Failed to fetch data for ${symbol}`);
    }
  }
  
  return dashboardStocks;
}
