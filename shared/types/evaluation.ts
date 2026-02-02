import type { StrategicGrowthEvaluation, TacticalSentinelEvaluation, StrategicGrowthStatus, TacticalSentinelStatus, StrategicLabels, TacticalLabels } from "./horizon";
import type { Stock, StockQuote, DataConfidence } from "./stock";

export interface MarketContextInfo {
  label: "Supportive" | "Mixed" | "Cautious";
  description: string;
}

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
  marketContext?: MarketContextInfo;
  decisionLabel?: {
    displayText: string;
    explanation: string;
    label: "GOOD_TO_ACT" | "WORTH_A_SMALL_LOOK" | "KEEP_AN_EYE_ON" | "PAUSE";
  };
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
  // Phase 2 lockdown fields
  decisionLabel?: {
    displayText: string;
    explanation: string;
    label: "GOOD_TO_ACT" | "WORTH_A_SMALL_LOOK" | "KEEP_AN_EYE_ON" | "PAUSE";
  };
  marketRegime?: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
  businessQualitySignals?: {
    fundamentals: "pass" | "caution" | "fail";
    institutional: "pass" | "caution" | "fail";
    macro: "pass" | "caution" | "fail";
  };
  marketTimingSignals?: {
    technical: "pass" | "caution" | "fail";
    momentum: "pass" | "caution" | "fail";
    sector: "pass" | "caution" | "fail";
    event: "pass" | "caution" | "fail";
  };
  sentimentScore?: number;
  marketContext?: MarketContextInfo;
}

export interface DashboardResponse {
  stocks: DashboardStock[];
  lastUpdated: number;
  marketRegime?: "RISK_ON" | "RISK_OFF" | "NEUTRAL";
  marketContext?: MarketContextInfo;
  marketConfidence?: "HIGH" | "MEDIUM" | "LOW";
  /** Shown when API keys are missing or data fetch failed; app still loads. */
  dataWarning?: string;
}
