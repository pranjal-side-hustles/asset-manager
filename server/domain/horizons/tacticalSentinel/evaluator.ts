import type { TacticalSentinelEvaluation } from "@shared/types/horizon";
import type { MarketContext } from "@shared/types/marketContext";
import {
  evaluateTechnicalAlignment,
  evaluateMomentumRegime,
  evaluateLiquidityTriggers,
  evaluateSentimentContext,
  evaluateEventProximity,
  evaluateTimeStopLogic,
  evaluateOpportunityRanking,
  type TacticalInputs,
} from "./rules";
import { buildTacticalEvaluation } from "./scoring";
import { ENGINE_VERSIONS, createEngineMetadata } from "../../engineMeta";
import { logger } from "../../../infra/logging/logger";
import { evaluateIntegrityGate } from "../../risk/integrityAudit";
import { deriveHorizonLabel } from "../../calibration";
import { roundScore } from "@shared/utils/scoring";

export interface TacticalSentinelResult extends TacticalSentinelEvaluation {
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
      adjustment = 8;
      break;
    case "RISK_OFF":
      adjustment = -12;
      break;
    case "NEUTRAL":
      adjustment = -3;
      break;
  }

  const adjustedScore = Math.max(0, Math.min(100, baseScore + adjustment));
  return { adjustedScore, adjustment };
}

export type SectorRegimeType = "FAVORED" | "NEUTRAL" | "AVOID";

function applySectorPenalty(
  score: number,
  sectorRegime?: SectorRegimeType
): { adjustedScore: number; sectorPenalty: number } {
  if (!sectorRegime || sectorRegime === "FAVORED") {
    return { adjustedScore: score, sectorPenalty: 0 };
  }
  
  let penalty = 0;
  if (sectorRegime === "AVOID") {
    penalty = -6;
  } else if (sectorRegime === "NEUTRAL") {
    penalty = -2;
  }
  
  const adjustedScore = Math.max(0, Math.min(100, score + penalty));
  return { adjustedScore, sectorPenalty: penalty };
}

export function evaluateTacticalSentinel(
  inputs: TacticalInputs,
  symbol?: string,
  marketContext?: MarketContext,
  sectorRegime?: SectorRegimeType
): TacticalSentinelResult {
  const startTime = Date.now();
  const log = logger.withContext({ 
    symbol, 
    engine: "tacticalSentinel", 
    version: ENGINE_VERSIONS.tacticalSentinel 
  });
  
  const details = {
    technicalAlignment: evaluateTechnicalAlignment(inputs),
    momentumRegime: evaluateMomentumRegime(inputs),
    liquidityTriggers: evaluateLiquidityTriggers(inputs),
    sentimentContext: evaluateSentimentContext(inputs),
    eventProximity: evaluateEventProximity(inputs),
    timeStopLogic: evaluateTimeStopLogic(inputs),
    opportunityRanking: evaluateOpportunityRanking(inputs),
  };

  const evaluation = buildTacticalEvaluation(details, inputs.daysToEarnings, inputs.hasUpcomingNews);
  
  const integrityResult = evaluateIntegrityGate({
    daysToEarnings: inputs.daysToEarnings,
    newsRisk: inputs.hasUpcomingNews,
  });

  const { adjustedScore: regimeAdjustedScore, adjustment } = applyRegimeAdjustment(
    evaluation.score,
    marketContext
  );
  
  const { adjustedScore: sectorAdjustedScore, sectorPenalty } = applySectorPenalty(
    regimeAdjustedScore,
    sectorRegime
  );
  
  const adjustedScore = Math.max(0, Math.min(100, sectorAdjustedScore + integrityResult.tacticalPenalty));

  const adjustedStatus = adjustedScore >= 70 ? "TRADE" : adjustedScore >= 50 ? "WATCH" : "AVOID";

  const meta = createEngineMetadata("tacticalSentinel");
  const duration = Date.now() - startTime;
  
  const totalAdjustment = adjustment + sectorPenalty + integrityResult.tacticalPenalty;
  
  log.engineEvaluation(
    `Evaluation complete: score=${adjustedScore}, status=${adjustedStatus}${totalAdjustment !== 0 ? `, total adjustment: ${totalAdjustment > 0 ? "+" : ""}${totalAdjustment}` : ""}`,
    {
      score: adjustedScore,
      baseScore: evaluation.score,
      status: adjustedStatus,
      regimeAdjustment: adjustment,
      sectorPenalty,
      regime: marketContext?.regime,
      sectorRegime,
      durationMs: duration,
    }
  );
  
  return {
    ...evaluation,
    score: roundScore(adjustedScore),
    status: adjustedStatus as "TRADE" | "WATCH" | "AVOID",
    integrityFlags: integrityResult.riskFlags.length > 0 ? integrityResult.riskFlags : undefined,
    meta,
    regimeAdjustment: totalAdjustment,
  };
}

export function createMockTacticalInputs(symbol: string): TacticalInputs {
  const hash = symbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = (hash * 7) % 100;
  
  return {
    dailyMaAlignment: seed > 35,
    hourlyMaAlignment: seed > 45,
    priceAboveVwap: seed > 40,
    momentumScore: 40 + (seed % 50),
    momentumDirection: seed > 60 ? "accelerating" : seed > 30 ? "stable" : "decelerating",
    averageVolume: 5000000 + (seed * 100000),
    currentVolume: 5000000 * (0.8 + (seed % 70) / 100),
    bidAskSpread: 0.02 + (seed % 10) / 100,
    putCallRatio: 0.6 + (seed % 60) / 100,
    socialSentiment: seed > 60 ? "bullish" : seed > 30 ? "neutral" : "bearish",
    daysToEarnings: 10 + (seed % 50),
    daysToExDividend: 15 + (seed % 60),
    hasUpcomingNews: seed % 5 === 0,
    daysInTrade: seed % 20,
    maxTradeDays: 30,
    relativeStrength: 40 + (seed % 55),
    sectorRank: 1 + (seed % 10),
  };
}
