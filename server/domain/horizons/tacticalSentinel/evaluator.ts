import type { TacticalSentinelEvaluation } from "@shared/types/horizon";
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

export function evaluateTacticalSentinel(inputs: TacticalInputs): TacticalSentinelEvaluation {
  const details = {
    technicalAlignment: evaluateTechnicalAlignment(inputs),
    momentumRegime: evaluateMomentumRegime(inputs),
    liquidityTriggers: evaluateLiquidityTriggers(inputs),
    sentimentContext: evaluateSentimentContext(inputs),
    eventProximity: evaluateEventProximity(inputs),
    timeStopLogic: evaluateTimeStopLogic(inputs),
    opportunityRanking: evaluateOpportunityRanking(inputs),
  };

  return buildTacticalEvaluation(details);
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
