import type { StrategicGrowthEvaluation } from "@shared/types/horizon";
import type { MarketContext } from "@shared/types/marketContext";
import {
  evaluateRiskGuardrails,
  evaluateMarketRegime,
  evaluateMacroAlignment,
  evaluateInstitutionalSignals,
  evaluateFundamentalAcceleration,
  evaluateWeeklyTechnical,
  evaluateThesisDecay,
  type StrategicInputs,
} from "./rules";
import { buildStrategicEvaluation } from "./scoring";
import { ENGINE_VERSIONS, createEngineMetadata } from "../../engineMeta";
import { logger } from "../../../infra/logging/logger";

export interface StrategicGrowthResult extends StrategicGrowthEvaluation {
  meta: {
    engine: string;
    version: string;
    evaluatedAt: Date;
  };
  regimeAdjustment?: number;
}

function applyRegimeAdjustment(
  baseScore: number,
  marketContext?: MarketContext
): { adjustedScore: number; adjustment: number } {
  if (!marketContext) {
    return { adjustedScore: baseScore, adjustment: 0 };
  }

  let adjustment = 0;

  switch (marketContext.regime) {
    case "RISK_ON":
      adjustment = 5;
      break;
    case "RISK_OFF":
      adjustment = -10;
      break;
    case "NEUTRAL":
      adjustment = -2;
      break;
  }

  const adjustedScore = Math.max(0, Math.min(100, baseScore + adjustment));
  return { adjustedScore, adjustment };
}

export function evaluateStrategicGrowth(
  inputs: StrategicInputs,
  symbol?: string,
  marketContext?: MarketContext
): StrategicGrowthResult {
  const startTime = Date.now();
  const log = logger.withContext({ 
    symbol, 
    engine: "strategicGrowth", 
    version: ENGINE_VERSIONS.strategicGrowth 
  });
  
  const details = {
    riskGuardrails: evaluateRiskGuardrails(inputs),
    marketRegime: evaluateMarketRegime(inputs),
    macroAlignment: evaluateMacroAlignment(inputs),
    institutionalSignals: evaluateInstitutionalSignals(inputs),
    fundamentalAcceleration: evaluateFundamentalAcceleration(inputs),
    weeklyTechnicalStructure: evaluateWeeklyTechnical(inputs),
    thesisDecay: evaluateThesisDecay(inputs),
  };

  const evaluation = buildStrategicEvaluation(details);
  
  const { adjustedScore, adjustment } = applyRegimeAdjustment(
    evaluation.score,
    marketContext
  );

  const adjustedStatus = adjustedScore >= 70 ? "ELIGIBLE" : adjustedScore >= 50 ? "WATCH" : "REJECT";

  const meta = createEngineMetadata("strategicGrowth");
  const duration = Date.now() - startTime;
  
  log.engineEvaluation(
    `Evaluation complete: score=${adjustedScore}, status=${adjustedStatus}${adjustment !== 0 ? `, regime adjustment: ${adjustment > 0 ? "+" : ""}${adjustment}` : ""}`,
    {
      score: adjustedScore,
      baseScore: evaluation.score,
      status: adjustedStatus,
      regimeAdjustment: adjustment,
      regime: marketContext?.regime,
      durationMs: duration,
    }
  );
  
  return {
    ...evaluation,
    score: adjustedScore,
    status: adjustedStatus as "ELIGIBLE" | "WATCH" | "REJECT",
    meta,
    regimeAdjustment: adjustment,
  };
}

export function createMockStrategicInputs(symbol: string): StrategicInputs {
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = hash % 100;
  
  return {
    portfolioConcentration: 10 + (seed % 20),
    sectorExposure: 15 + (seed % 25),
    vixLevel: 12 + (seed % 20),
    marketTrend: seed > 60 ? "bullish" : seed > 30 ? "neutral" : "bearish",
    gdpGrowth: 1.5 + (seed % 30) / 10,
    interestRateTrend: seed > 60 ? "falling" : seed > 30 ? "stable" : "rising",
    institutionalOwnership: 50 + (seed % 40),
    recentInstitutionalActivity: seed > 60 ? "buying" : seed > 30 ? "neutral" : "selling",
    revenueGrowth: 5 + (seed % 25),
    earningsAcceleration: (seed % 30) - 5,
    weeklyMaAlignment: seed > 40,
    weeklyRsiLevel: 40 + (seed % 35),
    daysInPosition: seed % 120,
    maxHoldingPeriod: 180,
  };
}
