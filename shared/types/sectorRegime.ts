export type SectorRegime = "FAVORED" | "NEUTRAL" | "AVOID";
export type SectorConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface SectorRegimeResult {
  sector: string;
  regime: SectorRegime;
  confidence: SectorConfidence;
  reasons: string[];
  evaluatedAt: Date;
}
