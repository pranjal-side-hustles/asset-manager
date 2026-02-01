export type CapitalPriority =
  | "BUY"
  | "ACCUMULATE"
  | "PILOT"
  | "WATCH"
  | "BLOCKED";

export interface RankedStock {
  symbol: string;
  sector: string;
  strategicScore: number;
  tacticalScore: number;
  strategicStatus: "ELIGIBLE" | "WATCH" | "REJECT";
  tacticalStatus: "TRADE" | "WATCH" | "AVOID";
  sectorRegime: "FAVORED" | "NEUTRAL" | "AVOID";
  portfolioAction: "ALLOW" | "REDUCE" | "BLOCK";
  rankInSector: number;
  capitalPriority: CapitalPriority;
  reasons: string[];
}
