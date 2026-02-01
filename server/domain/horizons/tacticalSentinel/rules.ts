import type { EvaluationDetail } from "@shared/types/horizon";
import { TACTICAL_THRESHOLDS } from "@shared/constants/thresholds";

export interface TacticalInputs {
  dailyMaAlignment: boolean;
  hourlyMaAlignment: boolean;
  priceAboveVwap: boolean;
  momentumScore: number;
  momentumDirection: "accelerating" | "stable" | "decelerating";
  averageVolume: number;
  currentVolume: number;
  bidAskSpread: number;
  putCallRatio: number;
  socialSentiment: "bullish" | "neutral" | "bearish";
  daysToEarnings: number;
  daysToExDividend: number;
  hasUpcomingNews: boolean;
  daysInTrade: number;
  maxTradeDays: number;
  relativeStrength: number;
  sectorRank: number;
}

function getStatus(score: number, maxScore: number): "pass" | "caution" | "fail" {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return "pass";
  if (percentage >= 40) return "caution";
  return "fail";
}

export function evaluateTechnicalAlignment(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.TECHNICAL_ALIGNMENT_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.dailyMaAlignment) {
    score += 8;
    breakdown.push("Daily moving averages aligned");
  } else {
    breakdown.push("Daily MA structure not aligned");
  }

  if (inputs.hourlyMaAlignment) {
    score += 6;
    breakdown.push("Hourly timeframe confirming");
  } else {
    breakdown.push("Hourly timeframe diverging");
  }

  if (inputs.priceAboveVwap) {
    score += 6;
    breakdown.push("Price above VWAP - institutional buying");
  } else {
    breakdown.push("Price below VWAP - selling pressure");
  }

  return {
    name: "Multi-Timeframe Technical Alignment",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Evaluates alignment across multiple timeframes",
    breakdown,
  };
}

export function evaluateMomentumRegime(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.MOMENTUM_REGIME_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.momentumScore > 70) {
    score += 10;
    breakdown.push(`Strong momentum score: ${inputs.momentumScore}`);
  } else if (inputs.momentumScore > 50) {
    score += 6;
    breakdown.push(`Moderate momentum: ${inputs.momentumScore}`);
  } else {
    score += 2;
    breakdown.push(`Weak momentum: ${inputs.momentumScore}`);
  }

  if (inputs.momentumDirection === "accelerating") {
    score += 5;
    breakdown.push("Momentum accelerating");
  } else if (inputs.momentumDirection === "stable") {
    score += 3;
    breakdown.push("Momentum stable");
  } else {
    breakdown.push("Momentum decelerating - caution");
  }

  return {
    name: "Momentum Regime",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Measures momentum strength and direction",
    breakdown,
  };
}

export function evaluateLiquidityTriggers(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.LIQUIDITY_TRIGGERS_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  const volumeRatio = inputs.currentVolume / inputs.averageVolume;
  
  if (volumeRatio > 1.5) {
    score += 8;
    breakdown.push(`High volume: ${(volumeRatio * 100).toFixed(0)}% of average`);
  } else if (volumeRatio > 1.0) {
    score += 5;
    breakdown.push(`Normal volume: ${(volumeRatio * 100).toFixed(0)}% of average`);
  } else {
    score += 2;
    breakdown.push(`Low volume: ${(volumeRatio * 100).toFixed(0)}% of average`);
  }

  if (inputs.bidAskSpread < 0.05) {
    score += 7;
    breakdown.push(`Tight spread: ${(inputs.bidAskSpread * 100).toFixed(2)}%`);
  } else if (inputs.bidAskSpread < 0.1) {
    score += 4;
    breakdown.push(`Moderate spread: ${(inputs.bidAskSpread * 100).toFixed(2)}%`);
  } else {
    breakdown.push(`Wide spread: ${(inputs.bidAskSpread * 100).toFixed(2)}%`);
  }

  return {
    name: "Liquidity & Volume Triggers",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Assesses market liquidity and volume conditions",
    breakdown,
  };
}

export function evaluateSentimentContext(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.SENTIMENT_CONTEXT_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.putCallRatio < 0.7) {
    score += 3;
    breakdown.push(`Bullish put/call: ${inputs.putCallRatio.toFixed(2)}`);
  } else if (inputs.putCallRatio < 1.0) {
    score += 5;
    breakdown.push(`Neutral put/call: ${inputs.putCallRatio.toFixed(2)}`);
  } else {
    score += 2;
    breakdown.push(`Bearish put/call: ${inputs.putCallRatio.toFixed(2)}`);
  }

  if (inputs.socialSentiment === "bullish") {
    score += 5;
    breakdown.push("Social sentiment positive");
  } else if (inputs.socialSentiment === "neutral") {
    score += 3;
    breakdown.push("Social sentiment neutral");
  } else {
    breakdown.push("Social sentiment negative");
  }

  return {
    name: "Sentiment & Options Context",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Gauges market sentiment from options and social data",
    breakdown,
  };
}

export function evaluateEventProximity(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.EVENT_PROXIMITY_WEIGHT;
  let score = maxScore;
  const breakdown: string[] = [];

  if (inputs.daysToEarnings < 3) {
    score -= 8;
    breakdown.push(`Earnings in ${inputs.daysToEarnings} days - high binary risk`);
  } else if (inputs.daysToEarnings <= 7) {
    score -= 3;
    breakdown.push(`Earnings approaching: ${inputs.daysToEarnings} days`);
  } else {
    breakdown.push(`Earnings distant: ${inputs.daysToEarnings} days`);
  }

  if (inputs.daysToExDividend < 3) {
    score -= 2;
    breakdown.push(`Ex-dividend in ${inputs.daysToExDividend} days`);
  }

  if (inputs.hasUpcomingNews) {
    score -= 2;
    breakdown.push("Pending news catalyst");
  } else {
    breakdown.push("No major news expected");
  }

  return {
    name: "Event Proximity",
    score: Math.max(0, score),
    maxScore,
    status: getStatus(Math.max(0, score), maxScore),
    summary: "Evaluates upcoming events that may impact price",
    breakdown,
  };
}

export function evaluateTimeStopLogic(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.TIME_STOP_LOGIC_WEIGHT;
  let score = maxScore;
  const breakdown: string[] = [];

  const tradePercentage = (inputs.daysInTrade / inputs.maxTradeDays) * 100;

  if (tradePercentage < 25) {
    breakdown.push(`Fresh trade: ${inputs.daysInTrade} days (${tradePercentage.toFixed(0)}% of max)`);
  } else if (tradePercentage < 50) {
    score -= 2;
    breakdown.push(`Trade progressing: ${inputs.daysInTrade} days (${tradePercentage.toFixed(0)}% of max)`);
  } else if (tradePercentage < 75) {
    score -= 5;
    breakdown.push(`Time stop approaching: ${inputs.daysInTrade} days (${tradePercentage.toFixed(0)}% of max)`);
  } else {
    score -= 8;
    breakdown.push(`Time stop imminent: consider exit`);
  }

  return {
    name: "Time Stop Logic",
    score: Math.max(0, score),
    maxScore,
    status: getStatus(Math.max(0, score), maxScore),
    summary: "Tracks time-based exit triggers",
    breakdown,
  };
}

export function evaluateOpportunityRanking(inputs: TacticalInputs): EvaluationDetail {
  const maxScore = TACTICAL_THRESHOLDS.OPPORTUNITY_RANKING_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.relativeStrength > 80) {
    score += 8;
    breakdown.push(`Strong relative strength: ${inputs.relativeStrength}`);
  } else if (inputs.relativeStrength > 50) {
    score += 5;
    breakdown.push(`Moderate relative strength: ${inputs.relativeStrength}`);
  } else {
    score += 2;
    breakdown.push(`Weak relative strength: ${inputs.relativeStrength}`);
  }

  if (inputs.sectorRank <= 3) {
    score += 7;
    breakdown.push(`Top sector rank: #${inputs.sectorRank}`);
  } else if (inputs.sectorRank <= 5) {
    score += 4;
    breakdown.push(`Good sector rank: #${inputs.sectorRank}`);
  } else {
    score += 1;
    breakdown.push(`Low sector rank: #${inputs.sectorRank}`);
  }

  return {
    name: "Opportunity Ranking",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Compares opportunity vs. alternatives",
    breakdown,
  };
}
