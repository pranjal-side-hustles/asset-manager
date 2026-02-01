import {
  PortfolioSnapshot,
  PortfolioConstraintResult,
} from "@shared/types/portfolio";

interface ConstraintInputs {
  sector: string;
  sectorRegime: "FAVORED" | "NEUTRAL" | "AVOID";
  expectedVolatilityPct: number;
}

export function evaluatePortfolioConstraints(
  portfolio: PortfolioSnapshot,
  inputs: ConstraintInputs
): PortfolioConstraintResult {
  const reasons: string[] = [];

  // Base position sizing (percentage of total capital)
  let basePositionSize = 10;

  // Sector exposure cap
  const currentSectorExposure = portfolio.sectorExposurePct[inputs.sector] ?? 0;
  if (currentSectorExposure >= 25) {
    return {
      action: "BLOCK",
      reasons: ["Sector exposure cap reached"],
      suggestedPositionSizePct: 0,
    };
  }

  // Sector regime adjustment
  if (inputs.sectorRegime === "AVOID") {
    return {
      action: "BLOCK",
      reasons: ["Sector regime unfavorable"],
      suggestedPositionSizePct: 0,
    };
  }

  if (inputs.sectorRegime === "NEUTRAL") {
    basePositionSize -= 3;
    reasons.push("Sector regime neutral — reduced sizing");
  }

  // Volatility budget
  if (portfolio.volatilityUsedPct >= 80) {
    return {
      action: "BLOCK",
      reasons: ["Portfolio volatility budget exhausted"],
      suggestedPositionSizePct: 0,
    };
  }

  if (portfolio.volatilityUsedPct >= 60) {
    basePositionSize -= 4;
    reasons.push("High portfolio volatility — reduced sizing");
  }

  // Expected volatility adjustment
  if (inputs.expectedVolatilityPct > 3) {
    basePositionSize -= 3;
    reasons.push("High expected volatility — reduced sizing");
  }

  const finalSize = Math.max(2, basePositionSize);

  return {
    action: finalSize < 5 ? "REDUCE" : "ALLOW",
    reasons,
    suggestedPositionSizePct: finalSize,
  };
}
