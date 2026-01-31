import type { Stock, StockQuote, DashboardStock, StockEvaluationResponse } from "@shared/types";
import { getMockStock, getAllMockStocks, createDynamicMockStock } from "./mockData";
import { evaluateStrategicGrowth, createMockStrategicInputs } from "../../domain/horizons/strategicGrowth/evaluator";
import { evaluateTacticalSentinel, createMockTacticalInputs } from "../../domain/horizons/tacticalSentinel/evaluator";

export async function fetchStockData(symbol: string): Promise<{ stock: Stock; quote: StockQuote } | null> {
  const mockData = getMockStock(symbol);
  
  if (mockData) {
    return mockData;
  }
  
  return createDynamicMockStock(symbol);
}

export async function fetchStockEvaluation(symbol: string): Promise<StockEvaluationResponse | null> {
  const stockData = await fetchStockData(symbol);
  
  if (!stockData) {
    return null;
  }
  
  const strategicInputs = createMockStrategicInputs(symbol);
  const tacticalInputs = createMockTacticalInputs(symbol);
  
  const strategicGrowth = evaluateStrategicGrowth(strategicInputs);
  const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs);
  
  return {
    stock: stockData.stock,
    quote: stockData.quote,
    evaluation: {
      strategicGrowth,
      tacticalSentinel,
      evaluatedAt: Date.now(),
    },
  };
}

export async function fetchDashboardStocks(): Promise<DashboardStock[]> {
  const allStocks = getAllMockStocks();
  
  return allStocks.map((stockData) => {
    const strategicInputs = createMockStrategicInputs(stockData.stock.symbol);
    const tacticalInputs = createMockTacticalInputs(stockData.stock.symbol);
    
    const strategicGrowth = evaluateStrategicGrowth(strategicInputs);
    const tacticalSentinel = evaluateTacticalSentinel(tacticalInputs);
    
    return {
      symbol: stockData.stock.symbol,
      companyName: stockData.stock.companyName,
      price: stockData.stock.price,
      change: stockData.stock.change,
      changePercent: stockData.stock.changePercent,
      strategicScore: strategicGrowth.score,
      strategicStatus: strategicGrowth.status,
      tacticalScore: tacticalSentinel.score,
      tacticalStatus: tacticalSentinel.status,
    };
  });
}
