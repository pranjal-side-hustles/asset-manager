import type { StrategicGrowthEvaluation, TacticalSentinelEvaluation, StrategicGrowthStatus, TacticalSentinelStatus, StrategicLabels, TacticalLabels } from "./horizon";
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
    horizonLabel?: string;
  };
  dataConfidence?: DataConfidence;
  confidenceReasons?: string[];
  warnings?: string[];
  providersUsed?: string[];
  marketRegime?: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
}

export interface DashboardStock {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  eodDate?: string;
  priceAvailable: boolean;
  strategicScore: number;
  strategicStatus: StrategicGrowthStatus;
  tacticalScore: number;
  tacticalStatus: TacticalSentinelStatus;
  horizonLabel?: string;
  strategicLabels?: StrategicLabels;
  tacticalLabels?: TacticalLabels;
  integrityFlags?: string[];
  // Phase 2 fields (optional for backward compatibility)
  sector?: string;
  sectorRegime?: "FAVORED" | "NEUTRAL" | "AVOID";
  portfolioAction?: "ALLOW" | "REDUCE" | "BLOCK";
  capitalPriority?: "BUY" | "ACCUMULATE" | "PILOT" | "WATCH" | "BLOCKED";
  rankInSector?: number;
  phase2Reasons?: string[];
}

export interface DashboardResponse {
  stocks: DashboardStock[];
  lastUpdated: number;
  marketRegime?: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
  marketConfidence?: "HIGH" | "MEDIUM" | "LOW";
}
