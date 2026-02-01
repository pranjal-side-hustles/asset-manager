import type { StrategicGrowthEvaluation, TacticalSentinelEvaluation, StrategicGrowthStatus, TacticalSentinelStatus } from "./horizon";
import type { Stock, StockQuote, DataConfidence } from "./stock";

export interface EngineMetadata {
  engine: string;
  version: string;
  evaluatedAt: Date;
}

export interface StockEvaluationResponse {
  stock: Stock;
  quote: StockQuote;
  evaluation: {
    strategicGrowth: StrategicGrowthEvaluation & { meta?: EngineMetadata };
    tacticalSentinel: TacticalSentinelEvaluation & { meta?: EngineMetadata };
    evaluatedAt: number;
  };
  dataConfidence?: DataConfidence;
  confidenceReasons?: string[];
  warnings?: string[];
  providersUsed?: string[];
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
