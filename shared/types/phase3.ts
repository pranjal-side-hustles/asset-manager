/**
 * Phase 3: Confirmation Layer Types
 * 
 * Phase 3 is SEPARATE from Phases 0-2.
 * It only CONFIRMS or REJECTS Phase 2 decisions.
 * It does NOT modify scores, prices, indicators, or portfolio logic.
 */

// ============================================================================
// Confirmation Level (Final Output)
// ============================================================================

export type ConfirmationLevel = "NONE" | "WEAK" | "STRONG";

// ============================================================================
// Individual Signal Types
// ============================================================================

export type Phase3SignalName =
    | "TREND"           // Price vs MA50/MA200
    | "VOLUME"          // Current vs average volume
    | "VOLATILITY"      // ATR% trend
    | "ALIGNMENT"       // Market + sector alignment
    | "EVENT_SAFETY";   // Earnings distance

export interface Phase3Signal {
    name: Phase3SignalName;
    label: string;
    passed: boolean;
    points: number;          // Points contributed (0 if not passed)
    maxPoints: number;       // Maximum possible points for this signal
    reason: string;          // Human-readable explanation
}

// ============================================================================
// Confirmation Result
// ============================================================================

export interface Phase3ConfirmationResult {
    // Core outputs as specified
    confirmationScore: number;               // Total points earned
    confirmationLevel: ConfirmationLevel;    // NONE / WEAK / STRONG
    confirmations: Phase3Signal[];           // Signals that PASSED
    blockers: Phase3Signal[];                // Signals that BLOCKED

    // Metadata
    maxPossibleScore: number;                // Sum of all maxPoints
    scorePercentage: number;                 // confirmationScore / maxPossibleScore
    allSignals: Phase3Signal[];              // All 5 signals with their status
    evaluatedAt: number;                     // Timestamp
}

// ============================================================================
// Phase 3 Input (from Phase 2 decision + market data)
// ============================================================================

export interface Phase3Input {
    // Price/Technical data for confirmation signals
    currentPrice: number;
    ma50: number;
    ma200: number;

    // Volume data
    currentVolume: number;
    avgVolume: number;          // 20-day average

    // Volatility data
    atrPercent: number;         // ATR as % of price
    atrPercentPrev: number;     // Previous ATR% for trend

    // Market context (from Phase 0)
    marketRegime: string;       // RISK_ON, NEUTRAL, RISK_OFF
    sectorRegime: string;       // FAVORABLE, NEUTRAL, UNFAVORABLE

    // Event data
    daysToEarnings?: number;    // Days until next earnings (undefined if unknown)
}

// ============================================================================
// Thresholds (configurable)
// ============================================================================

export interface Phase3Thresholds {
    // Trend confirmation
    trendMaBuffer: number;      // % buffer for MA crossover (default: 1%)

    // Volume confirmation  
    volumeMinMultiple: number;  // Min volume vs avg (default: 1.0)
    volumeStrongMultiple: number; // Strong volume vs avg (default: 1.5)

    // Volatility confirmation
    maxAtrPercent: number;      // Max ATR% for confirmation (default: 5%)
    atrTrendThreshold: number;  // ATR% decrease for trend (default: 0.5%)

    // Event safety
    minDaysToEarnings: number;  // Minimum days to earnings (default: 5)
    safeDaysToEarnings: number; // Safe days to earnings (default: 14)
}

export const DEFAULT_PHASE3_THRESHOLDS: Phase3Thresholds = {
    trendMaBuffer: 0.01,        // 1%
    volumeMinMultiple: 1.0,
    volumeStrongMultiple: 1.5,
    maxAtrPercent: 5.0,
    atrTrendThreshold: 0.5,
    minDaysToEarnings: 5,
    safeDaysToEarnings: 14,
};

// ============================================================================
// Point Values (fixed as per spec)
// ============================================================================

export const PHASE3_POINT_VALUES = {
    TREND: 3,           // 3 points for trend confirmation
    VOLUME: 2,          // 2 points for volume confirmation
    VOLATILITY: 2,      // 2 points for volatility confirmation
    ALIGNMENT: 2,       // 2 points for market/sector alignment
    EVENT_SAFETY: 1,    // 1 point for event safety
} as const;

// Max possible score: 3 + 2 + 2 + 2 + 1 = 10

// ============================================================================
// Score to Level Mapping
// ============================================================================

export const PHASE3_LEVEL_THRESHOLDS = {
    STRONG: 8,    // 8+ points = STRONG confirmation
    WEAK: 4,      // 4-7 points = WEAK confirmation  
    NONE: 0,      // 0-3 points = NO confirmation
} as const;
