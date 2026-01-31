import type { StrategicGrowthEvaluation, TacticalSentinelEvaluation, StrategicGrowthStatus, TacticalSentinelStatus } from "./horizon";
import type { Stock, StockQuote } from "./stock";

export interface StockEvaluationResponse {
  stock: Stock;
  quote: StockQuote;
  evaluation: {
    strategicGrowth: StrategicGrowthEvaluation;
    tacticalSentinel: TacticalSentinelEvaluation;
    evaluatedAt: number;
  };
}

export interface DashboardStock {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  strategicScore: number;
  strategicStatus: StrategicGrowthStatus;
  tacticalScore: number;
  tacticalStatus: TacticalSentinelStatus;
}

export interface DashboardResponse {
  stocks: DashboardStock[];
  lastUpdated: number;
}
