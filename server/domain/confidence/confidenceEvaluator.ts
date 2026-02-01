import { logger } from "../../infra/logging/logger";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface ConfidenceResult {
  level: ConfidenceLevel;
  score: number;
  reasons: string[];
}

export interface ConfidenceInputs {
  providersUsed: string[];
  providersFailed: string[];
  priceDataAvailable: boolean;
  technicalsAvailable: boolean;
  fundamentalsAvailable: boolean;
  sentimentAvailable: boolean;
  optionsAvailable: boolean;
  dataAgeMs?: number;
  marketRegimeKnown?: boolean;
}

const PROVIDER_WEIGHTS: Record<string, number> = {
  "TwelveData-Quote": 30,
  "TwelveData-OHLC": 20,
  "Mock-Quote": 5,
  "Mock-OHLC": 5,
  "Computed-Technicals": 15,
  "Finnhub-Sentiment": 10,
  "Finnhub-Institutional": 5,
  "Finnhub-Options": 5,
  "Mock-Fundamentals": 10,
  "Mock-Sentiment": 3,
  "Mock-Options": 2,
  "Marketstack-Historical": 5,
};

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function evaluateConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  const reasons: string[] = [];
  let score = 100;
  
  const totalWeight = Object.values(PROVIDER_WEIGHTS).reduce((a, b) => a + b, 0);
  let availableWeight = 0;
  
  for (const provider of inputs.providersUsed) {
    availableWeight += PROVIDER_WEIGHTS[provider] || 0;
  }
  
  const providerScore = (availableWeight / totalWeight) * 100;
  
  if (inputs.providersFailed.length > 0) {
    const failedWeight = inputs.providersFailed.reduce(
      (sum, p) => sum + (PROVIDER_WEIGHTS[p] || 0),
      0
    );
    score -= (failedWeight / totalWeight) * 50;
    reasons.push(`${inputs.providersFailed.length} provider(s) unavailable: ${inputs.providersFailed.slice(0, 3).join(", ")}${inputs.providersFailed.length > 3 ? "..." : ""}`);
  }
  
  if (!inputs.priceDataAvailable) {
    score -= 25;
    reasons.push("Price data unavailable - using fallback");
  }
  
  if (!inputs.fundamentalsAvailable) {
    score -= 15;
    reasons.push("Fundamental data unavailable");
  }
  
  if (!inputs.technicalsAvailable) {
    score -= 15;
    reasons.push("Technical indicators unavailable");
  }
  
  if (!inputs.sentimentAvailable) {
    score -= 10;
    reasons.push("Sentiment data unavailable");
  }
  
  if (!inputs.optionsAvailable) {
    score -= 5;
    reasons.push("Options data unavailable");
  }
  
  if (inputs.dataAgeMs !== undefined && inputs.dataAgeMs > STALE_THRESHOLD_MS) {
    const staleMinutes = Math.round(inputs.dataAgeMs / 60000);
    score -= Math.min(20, Math.floor(inputs.dataAgeMs / STALE_THRESHOLD_MS) * 5);
    reasons.push(`Data is ${staleMinutes} minutes old`);
  }
  
  if (inputs.marketRegimeKnown === false) {
    score -= 10;
    reasons.push("Market regime unknown");
  }
  
  score = Math.max(0, Math.min(100, score));
  
  let level: ConfidenceLevel;
  if (score >= 80) {
    level = "HIGH";
  } else if (score >= 50) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }
  
  if (reasons.length > 0) {
    logger.confidenceDowngrade(`Confidence: ${level} (${score.toFixed(0)}%)`, {
      level,
      score,
      reasons,
    });
  }
  
  return {
    level,
    score: Math.round(score),
    reasons,
  };
}

export function degradeConfidence(
  current: ConfidenceResult,
  reason: string,
  penalty: number = 10
): ConfidenceResult {
  const newScore = Math.max(0, current.score - penalty);
  const newReasons = [...current.reasons, reason];
  
  let level: ConfidenceLevel;
  if (newScore >= 80) {
    level = "HIGH";
  } else if (newScore >= 50) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }
  
  if (level !== current.level) {
    logger.confidenceDowngrade(`Confidence downgraded: ${current.level} -> ${level}`, {
      previousScore: current.score,
      newScore,
      reason,
    });
  }
  
  return {
    level,
    score: newScore,
    reasons: newReasons,
  };
}

export function createHighConfidence(): ConfidenceResult {
  return {
    level: "HIGH",
    score: 100,
    reasons: [],
  };
}

export function createLowConfidence(reasons: string[]): ConfidenceResult {
  return {
    level: "LOW",
    score: 30,
    reasons,
  };
}
