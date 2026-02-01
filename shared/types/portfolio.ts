export type PortfolioAction = "ALLOW" | "REDUCE" | "BLOCK";

export interface PortfolioSnapshot {
  totalCapital: number;
  sectorExposurePct: Record<string, number>;
  correlatedExposurePct: Record<string, number>;
  volatilityUsedPct: number;
}

export interface PortfolioConstraintResult {
  action: PortfolioAction;
  reasons: string[];
  suggestedPositionSizePct: number;
}
