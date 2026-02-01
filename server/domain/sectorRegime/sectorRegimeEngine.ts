import { SectorRegimeResult, SectorRegime, SectorConfidence } from "@shared/types/sectorRegime";

export interface SectorInputs {
  relativeStrength: "UP" | "FLAT" | "DOWN";
  trendHealth: "STRONG" | "NEUTRAL" | "WEAK";
  volatility: "LOW" | "NORMAL" | "HIGH";
  macroAlignment: "TAILWIND" | "NEUTRAL" | "HEADWIND";
}

export function evaluateSectorRegime(
  sector: string,
  inputs: SectorInputs
): SectorRegimeResult {
  let score = 0;
  const reasons: string[] = [];

  if (inputs.relativeStrength === "UP") {
    score += 1;
    reasons.push("Sector outperforming market");
  } else if (inputs.relativeStrength === "DOWN") {
    score -= 1;
    reasons.push("Sector underperforming market");
  }

  if (inputs.trendHealth === "STRONG") {
    score += 1;
    reasons.push("Sector trend structurally strong");
  } else if (inputs.trendHealth === "WEAK") {
    score -= 1;
    reasons.push("Sector trend weakening");
  }

  if (inputs.volatility === "HIGH") {
    score -= 1;
    reasons.push("Sector volatility elevated");
  } else if (inputs.volatility === "LOW") {
    score += 1;
    reasons.push("Sector volatility stable");
  }

  if (inputs.macroAlignment === "TAILWIND") {
    score += 1;
    reasons.push("Macro environment supportive");
  } else if (inputs.macroAlignment === "HEADWIND") {
    score -= 1;
    reasons.push("Macro environment unsupportive");
  }

  let regime: SectorRegime;
  let confidence: SectorConfidence;

  if (score >= 2) {
    regime = "FAVORED";
    confidence = score >= 3 ? "HIGH" : "MEDIUM";
  } else if (score <= -2) {
    regime = "AVOID";
    confidence = score <= -3 ? "HIGH" : "MEDIUM";
  } else {
    regime = "NEUTRAL";
    confidence = "MEDIUM";
  }

  return {
    sector,
    regime,
    confidence,
    reasons,
    evaluatedAt: new Date(),
  };
}
