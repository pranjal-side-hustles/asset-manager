import {
  MarketRegime,
  IndexState,
  BreadthData,
  DataConfidenceLevel,
} from "../../../shared/types/marketContext";
import { VolatilityData } from "../../services/market/fetchVolatility";
import { logger } from "../../infra/logging/logger";

interface RegimeInput {
  indices: { spy: IndexState; qqq: IndexState; dia: IndexState; iwm: IndexState };
  breadth: BreadthData;
  volatility: VolatilityData;
}

interface RegimeResult {
  regime: MarketRegime;
  confidence: DataConfidenceLevel;
  reasons: string[];
}

export function evaluateMarketRegime(input: RegimeInput): RegimeResult {
  const reasons: string[] = [];
  let riskOnScore = 0;
  let riskOffScore = 0;

  const { indices, breadth, volatility } = input;

  const indicesUp = [indices.spy, indices.qqq, indices.dia, indices.iwm].filter(
    (i) => i.trend === "UP"
  ).length;
  const indicesDown = [indices.spy, indices.qqq, indices.dia, indices.iwm].filter(
    (i) => i.trend === "DOWN"
  ).length;
  const aboveMA = [indices.spy, indices.qqq, indices.dia, indices.iwm].filter(
    (i) => i.above200DMA
  ).length;

  if (indicesUp >= 3) {
    riskOnScore += 25;
    reasons.push(`${indicesUp}/4 major indices trending UP`);
  } else if (indicesDown >= 3) {
    riskOffScore += 25;
    reasons.push(`${indicesDown}/4 major indices trending DOWN`);
  } else {
    reasons.push("Mixed index trends");
  }

  if (aboveMA >= 3) {
    riskOnScore += 20;
    reasons.push(`${aboveMA}/4 indices above 200-day MA`);
  } else if (aboveMA <= 1) {
    riskOffScore += 20;
    reasons.push(`Only ${aboveMA}/4 indices above 200-day MA`);
  }

  if (indices.spy.momentum === "POSITIVE") {
    riskOnScore += 10;
  } else if (indices.spy.momentum === "NEGATIVE") {
    riskOffScore += 10;
  }

  if (breadth.health === "STRONG") {
    riskOnScore += 25;
    reasons.push(`Strong breadth: ${breadth.pctAbove200DMA.toFixed(1)}% above 200DMA`);
  } else if (breadth.health === "WEAK") {
    riskOffScore += 25;
    reasons.push(`Weak breadth: ${breadth.pctAbove200DMA.toFixed(1)}% above 200DMA`);
  } else {
    reasons.push(`Neutral breadth: ${breadth.pctAbove200DMA.toFixed(1)}% above 200DMA`);
  }

  if (breadth.advanceDeclineRatio > 1.5) {
    riskOnScore += 10;
    reasons.push(`Advance/Decline ratio favorable: ${breadth.advanceDeclineRatio.toFixed(2)}`);
  } else if (breadth.advanceDeclineRatio < 0.7) {
    riskOffScore += 10;
    reasons.push(`Advance/Decline ratio weak: ${breadth.advanceDeclineRatio.toFixed(2)}`);
  }

  if (volatility.isElevated) {
    riskOffScore += 15;
    reasons.push(`Elevated volatility (VIX: ${volatility.vixLevel.toFixed(1)})`);
  } else if (volatility.vixLevel < 15) {
    riskOnScore += 10;
    reasons.push(`Low volatility (VIX: ${volatility.vixLevel.toFixed(1)})`);
  }

  if (volatility.vixTrend === "UP") {
    riskOffScore += 5;
  } else if (volatility.vixTrend === "DOWN") {
    riskOnScore += 5;
  }

  let regime: MarketRegime;
  let confidence: DataConfidenceLevel;

  const netScore = riskOnScore - riskOffScore;

  if (netScore >= 30) {
    regime = "RISK_ON";
    confidence = netScore >= 50 ? "HIGH" : "MEDIUM";
    reasons.unshift("Market regime: RISK ON");
  } else if (netScore <= -30) {
    regime = "RISK_OFF";
    confidence = netScore <= -50 ? "HIGH" : "MEDIUM";
    reasons.unshift("Market regime: RISK OFF");
  } else {
    regime = "NEUTRAL";
    confidence = Math.abs(netScore) < 15 ? "HIGH" : "MEDIUM";
    reasons.unshift("Market regime: NEUTRAL");
  }

  logger.engineEvaluation(
    `Market regime: ${regime} (score: ${netScore}, confidence: ${confidence})`,
    { riskOnScore, riskOffScore, netScore }
  );

  return {
    regime,
    confidence,
    reasons,
  };
}
