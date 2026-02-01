export type MarketRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";
export type TrendDirection = "UP" | "SIDEWAYS" | "DOWN";
export type Momentum = "POSITIVE" | "NEUTRAL" | "NEGATIVE";
export type BreadthHealth = "STRONG" | "NEUTRAL" | "WEAK";
export type SectorTrend = "LEADING" | "LAGGING" | "NEUTRAL";
export type DataConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface IndexState {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  trend: TrendDirection;
  above200DMA: boolean;
  momentum: Momentum;
  ma200: number;
}

export interface BreadthData {
  pctAbove200DMA: number;
  advanceDeclineRatio: number;
  newHighsLowsRatio: number;
  health: BreadthHealth;
}

export interface SectorState {
  name: string;
  symbol: string;
  trend: SectorTrend;
  relativeStrength: number;
  changePercent: number;
}

export interface MarketContext {
  regime: MarketRegime;
  regimeReasons: string[];
  confidence: DataConfidenceLevel;

  indices: {
    spy: IndexState;
    qqq: IndexState;
    dia: IndexState;
    iwm: IndexState;
  };

  breadth: BreadthData;

  sectors: SectorState[];

  volatility: {
    vixLevel: number;
    vixTrend: TrendDirection;
    isElevated: boolean;
  };

  evaluatedAt: Date;
  dataFreshness: Date;
}

export interface MarketContextSnapshot {
  context: MarketContext;
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    warnings: string[];
    cacheHit: boolean;
  };
}
