export type StrategicGrowthStatus = "ELIGIBLE" | "WATCH" | "REJECT";
export type TacticalSentinelStatus = "TRADE" | "WATCH" | "AVOID";

export interface StrategicGrowthEvaluation {
  score: number;
  status: StrategicGrowthStatus;
  positives: string[];
  risks: string[];
  failureMode: string;
  details: {
    riskGuardrails: EvaluationDetail;
    marketRegime?: EvaluationDetail; // ✅ OPTIONAL
    macroAlignment: EvaluationDetail;
    institutionalSignals: EvaluationDetail;
    fundamentalAcceleration: EvaluationDetail;
    weeklyTechnicalStructure: EvaluationDetail;
    thesisDecay: EvaluationDetail;
  };
}

export interface TacticalSentinelEvaluation {
  score: number;
  status: TacticalSentinelStatus;
  entryQuality: string[];
  risks: string[];
  failureTrigger: string;
  details: {
    technicalAlignment: EvaluationDetail;
    momentumRegime: EvaluationDetail;
    liquidityTriggers: EvaluationDetail;
    sentimentContext: EvaluationDetail;
    eventProximity: EvaluationDetail;
    timeStopLogic: EvaluationDetail;
    opportunityRanking: EvaluationDetail;
  };
}

export interface EvaluationDetail {
  name: string;
  score: number;
  maxScore: number;
  status: "pass" | "caution" | "fail";
  summary: string;
  breakdown: string[];
}

export interface HorizonEvaluationResult {
  symbol: string;
  evaluatedAt: number;
  strategicGrowth: StrategicGrowthEvaluation;
  tacticalSentinel: TacticalSentinelEvaluation;
}
