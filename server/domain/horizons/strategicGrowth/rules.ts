import type { EvaluationDetail } from "@shared/types/horizon";
import { STRATEGIC_THRESHOLDS, SCORE_LEVELS } from "@shared/constants/thresholds";

export interface StrategicInputs {
  portfolioConcentration: number;
  sectorExposure: number;
  vixLevel: number;
  marketTrend: "bullish" | "neutral" | "bearish";
  gdpGrowth: number;
  interestRateTrend: "rising" | "stable" | "falling";
  institutionalOwnership: number;
  recentInstitutionalActivity: "buying" | "neutral" | "selling";
  revenueGrowth: number;
  earningsAcceleration: number;
  weeklyMaAlignment: boolean;
  weeklyRsiLevel: number;
  daysInPosition: number;
  maxHoldingPeriod: number;
}

function getStatus(score: number, maxScore: number): "pass" | "caution" | "fail" {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 70) return "pass";
  if (percentage >= 40) return "caution";
  return "fail";
}

export function evaluateRiskGuardrails(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.RISK_GUARDRAILS_WEIGHT;
  let score = maxScore;
  const breakdown: string[] = [];

  if (inputs.portfolioConcentration > 25) {
    score -= 5;
    breakdown.push(`High portfolio concentration: ${inputs.portfolioConcentration}%`);
  } else {
    breakdown.push(`Portfolio concentration within limits: ${inputs.portfolioConcentration}%`);
  }

  if (inputs.sectorExposure > 30) {
    score -= 5;
    breakdown.push(`Elevated sector exposure: ${inputs.sectorExposure}%`);
  } else {
    breakdown.push(`Sector exposure balanced: ${inputs.sectorExposure}%`);
  }

  score = Math.max(0, score);

  return {
    name: "Risk & Portfolio Guardrails",
    score,
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Evaluates position sizing and concentration risks",
    breakdown,
  };
}

export function evaluateMarketRegime(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.MARKET_REGIME_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.vixLevel < 20) {
    score += 8;
    breakdown.push(`Low volatility environment: VIX at ${inputs.vixLevel}`);
  } else if (inputs.vixLevel < 30) {
    score += 4;
    breakdown.push(`Moderate volatility: VIX at ${inputs.vixLevel}`);
  } else {
    breakdown.push(`High volatility regime: VIX at ${inputs.vixLevel}`);
  }

  if (inputs.marketTrend === "bullish") {
    score += 7;
    breakdown.push("Market trend is bullish");
  } else if (inputs.marketTrend === "neutral") {
    score += 4;
    breakdown.push("Market trend is neutral");
  } else {
    breakdown.push("Market trend is bearish - caution advised");
  }

  return {
    name: "Market & Volatility Regime",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Assesses overall market conditions and volatility",
    breakdown,
  };
}

export function evaluateMacroAlignment(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.MACRO_ALIGNMENT_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.gdpGrowth > 2) {
    score += 5;
    breakdown.push(`Strong GDP growth: ${inputs.gdpGrowth}%`);
  } else if (inputs.gdpGrowth > 0) {
    score += 3;
    breakdown.push(`Moderate GDP growth: ${inputs.gdpGrowth}%`);
  } else {
    breakdown.push(`Negative GDP growth: ${inputs.gdpGrowth}%`);
  }

  if (inputs.interestRateTrend === "falling") {
    score += 5;
    breakdown.push("Interest rates falling - positive for equities");
  } else if (inputs.interestRateTrend === "stable") {
    score += 3;
    breakdown.push("Interest rates stable");
  } else {
    score += 1;
    breakdown.push("Interest rates rising - headwind for growth stocks");
  }

  return {
    name: "Macro Alignment",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Evaluates macroeconomic conditions",
    breakdown,
  };
}

export function evaluateInstitutionalSignals(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.INSTITUTIONAL_SIGNALS_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.institutionalOwnership > 70) {
    score += 8;
    breakdown.push(`High institutional ownership: ${inputs.institutionalOwnership}%`);
  } else if (inputs.institutionalOwnership > 50) {
    score += 5;
    breakdown.push(`Moderate institutional ownership: ${inputs.institutionalOwnership}%`);
  } else {
    score += 2;
    breakdown.push(`Low institutional ownership: ${inputs.institutionalOwnership}%`);
  }

  if (inputs.recentInstitutionalActivity === "buying") {
    score += 7;
    breakdown.push("Institutions actively accumulating");
  } else if (inputs.recentInstitutionalActivity === "neutral") {
    score += 4;
    breakdown.push("Institutional activity neutral");
  } else {
    breakdown.push("Institutions reducing positions");
  }

  return {
    name: "Institutional Signals",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Tracks smart money positioning and activity",
    breakdown,
  };
}

export function evaluateFundamentalAcceleration(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.FUNDAMENTAL_ACCELERATION_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.revenueGrowth > 20) {
    score += 10;
    breakdown.push(`Strong revenue growth: ${inputs.revenueGrowth}%`);
  } else if (inputs.revenueGrowth > 10) {
    score += 6;
    breakdown.push(`Moderate revenue growth: ${inputs.revenueGrowth}%`);
  } else if (inputs.revenueGrowth > 0) {
    score += 3;
    breakdown.push(`Low revenue growth: ${inputs.revenueGrowth}%`);
  } else {
    breakdown.push(`Negative revenue growth: ${inputs.revenueGrowth}%`);
  }

  if (inputs.earningsAcceleration > 15) {
    score += 10;
    breakdown.push(`Strong earnings acceleration: ${inputs.earningsAcceleration}%`);
  } else if (inputs.earningsAcceleration > 5) {
    score += 6;
    breakdown.push(`Moderate earnings growth: ${inputs.earningsAcceleration}%`);
  } else if (inputs.earningsAcceleration > 0) {
    score += 3;
    breakdown.push(`Slight earnings growth: ${inputs.earningsAcceleration}%`);
  } else {
    breakdown.push(`Earnings declining: ${inputs.earningsAcceleration}%`);
  }

  return {
    name: "Fundamental Acceleration",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Measures revenue and earnings momentum",
    breakdown,
  };
}

export function evaluateWeeklyTechnical(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.WEEKLY_TECHNICAL_WEIGHT;
  let score = 0;
  const breakdown: string[] = [];

  if (inputs.weeklyMaAlignment) {
    score += 8;
    breakdown.push("Weekly moving averages aligned bullishly");
  } else {
    breakdown.push("Weekly MA structure not aligned");
  }

  if (inputs.weeklyRsiLevel > 50 && inputs.weeklyRsiLevel < 70) {
    score += 7;
    breakdown.push(`Weekly RSI in optimal range: ${inputs.weeklyRsiLevel}`);
  } else if (inputs.weeklyRsiLevel >= 30 && inputs.weeklyRsiLevel <= 80) {
    score += 4;
    breakdown.push(`Weekly RSI acceptable: ${inputs.weeklyRsiLevel}`);
  } else {
    breakdown.push(`Weekly RSI extreme: ${inputs.weeklyRsiLevel}`);
  }

  return {
    name: "Weekly Technical Structure",
    score: Math.min(score, maxScore),
    maxScore,
    status: getStatus(score, maxScore),
    summary: "Analyzes weekly chart structure and momentum",
    breakdown,
  };
}

export function evaluateThesisDecay(inputs: StrategicInputs): EvaluationDetail {
  const maxScore = STRATEGIC_THRESHOLDS.THESIS_DECAY_WEIGHT;
  let score = maxScore;
  const breakdown: string[] = [];

  const holdingPercentage = (inputs.daysInPosition / inputs.maxHoldingPeriod) * 100;

  if (holdingPercentage < 50) {
    breakdown.push(`Position fresh: ${inputs.daysInPosition} days (${holdingPercentage.toFixed(0)}% of max)`);
  } else if (holdingPercentage < 75) {
    score -= 3;
    breakdown.push(`Position aging: ${inputs.daysInPosition} days (${holdingPercentage.toFixed(0)}% of max)`);
  } else if (holdingPercentage < 100) {
    score -= 6;
    breakdown.push(`Thesis near expiry: ${inputs.daysInPosition} days (${holdingPercentage.toFixed(0)}% of max)`);
  } else {
    score -= 10;
    breakdown.push(`Thesis expired: exceeded max holding period`);
  }

  return {
    name: "Time-Based Thesis Decay",
    score: Math.max(0, score),
    maxScore,
    status: getStatus(Math.max(0, score), maxScore),
    summary: "Tracks time remaining in investment thesis",
    breakdown,
  };
}
