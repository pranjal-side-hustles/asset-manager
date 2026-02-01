/**
 * Phase 3: Confirmation Layers Types
 * 
 * Confirmation layers provide additional signals that can upgrade or downgrade
 * trade recommendations from the core Strategic Growth and Tactical Sentinel engines.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ConfirmationLayerName = 
  | "BREADTH" 
  | "INSTITUTIONAL" 
  | "OPTIONS" 
  | "SENTIMENT" 
  | "EVENTS";

export type ConfirmationSignal = 
  | "CONFIRMING" 
  | "NEUTRAL" 
  | "DISCONFIRMING";

export type OverallConfirmationSignal = 
  | "STRONG_CONFIRM" 
  | "CONFIRM" 
  | "NEUTRAL" 
  | "DISCONFIRM" 
  | "STRONG_DISCONFIRM";

export type ConfirmationConfidence = "HIGH" | "MEDIUM" | "LOW";

// ============================================================================
// Layer Results
// ============================================================================

export interface ConfirmationLayerResult {
  layer: ConfirmationLayerName;
  signal: ConfirmationSignal;
  confidence: ConfirmationConfidence;
  scoreAdjustment: number; // -5 to +5
  reasons: string[];
  dataAvailable: boolean;
}

export interface ConfirmationResult {
  layers: ConfirmationLayerResult[];
  netAdjustment: number;
  overallSignal: OverallConfirmationSignal;
  flags: ConfirmationFlag[];
  evaluatedAt: number; // timestamp
}

// ============================================================================
// Confirmation Flags (warnings/alerts)
// ============================================================================

export type ConfirmationFlag = 
  | "EARNINGS_IMMINENT"      // Earnings < 5 days
  | "EARNINGS_SOON"          // Earnings 5-14 days
  | "INSIDER_SELLING"        // Recent insider selling detected
  | "INSIDER_BUYING"         // Recent insider buying detected
  | "HIGH_PUT_CALL"          // Put/Call > 1.2 (bearish options flow)
  | "LOW_PUT_CALL"           // Put/Call < 0.6 (bullish options flow)
  | "ELEVATED_IV"            // IV rank > 80
  | "INSTITUTIONAL_EXIT"     // Major institutional selling
  | "WEAK_BREADTH"           // Market breadth deteriorating
  | "DIVIDEND_UPCOMING"      // Ex-dividend within 7 days
  | "MAJOR_NEWS_PENDING";    // Significant news expected

// ============================================================================
// Input Data Types (from providers)
// ============================================================================

export interface BreadthConfirmationData {
  pctAbove200DMA: number;
  advanceDeclineRatio: number;
  newHighsLowsRatio: number;
  health: "STRONG" | "NEUTRAL" | "WEAK";
  // Additional flow data
  moneyFlowIndex?: number;      // 0-100
  cumulativeADLine?: "RISING" | "FLAT" | "FALLING";
}

export interface InstitutionalConfirmationData {
  institutionalOwnership?: number;  // percentage
  institutionalTrend: "INCREASING" | "FLAT" | "DECREASING";
  topHolders: string[];
  recentFilings?: number;           // count of recent 13F filings
}

export interface OptionsConfirmationData {
  putCallRatio: number;
  totalOpenInterest: number;
  callOpenInterest: number;
  putOpenInterest: number;
  impliedVolatility?: number;
  ivRank?: number;                  // 0-100 (IV percentile)
  unusualActivity?: boolean;
}

export interface SentimentConfirmationData {
  analystRating: number;            // 1-5 scale
  analystPriceTarget?: number;
  insiderBuying: boolean;
  recommendationTrend: {
    buy: number;
    hold: number;
    sell: number;
  };
  socialSentiment?: "BULLISH" | "NEUTRAL" | "BEARISH";
  newsScore?: number;               // -1 to +1
}

export interface EventsConfirmationData {
  daysToEarnings?: number;
  daysToExDividend?: number;
  hasUpcomingNews: boolean;
  recentNewsCount: number;
  nextEarningsDate?: string;        // ISO date string
  nextDividendDate?: string;        // ISO date string
}

// ============================================================================
// Aggregated Confirmation Data
// ============================================================================

export interface StockConfirmationData {
  breadth: BreadthConfirmationData;
  institutional: InstitutionalConfirmationData;
  options: OptionsConfirmationData;
  sentiment: SentimentConfirmationData;
  events: EventsConfirmationData;
}

// ============================================================================
// Response Types (for API)
// ============================================================================

export interface ConfirmationResponse {
  symbol: string;
  confirmation: ConfirmationResult;
  data: StockConfirmationData;
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    cachedLayers: ConfirmationLayerName[];
    evaluatedAt: number;
  };
}
