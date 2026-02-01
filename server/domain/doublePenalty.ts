/**
 * DOUBLE PENALTY PREVENTION
 * 
 * Phase 2 Lockdown: Never penalize twice for the same risk.
 * 
 * Example:
 * - Sector = Avoid
 * - Market = Risk-Off
 * → Apply ONE combined penalty, not stacked suppression.
 * 
 * This avoids over-pessimism.
 */

// ============================================================================
// Types
// ============================================================================

export type SectorRegime = "FAVORABLE" | "NEUTRAL" | "AVOID";
export type MarketRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";

export interface RegimePenaltyResult {
    /** The single combined penalty to apply */
    penalty: number;

    /** Which regime was worst */
    worstRegime: "SECTOR" | "MARKET" | "BOTH" | "NONE";

    /** Human-readable explanation */
    explanation: string;

    /** Whether any penalty was applied */
    hasPenalty: boolean;
}

// ============================================================================
// Penalty Values (LOCKED)
// ============================================================================

const PENALTIES = {
    SECTOR_AVOID: -10,
    MARKET_RISK_OFF: -10,
    SECTOR_NEUTRAL: 0,
    MARKET_NEUTRAL: 0,
    SECTOR_FAVORABLE: 0,
    MARKET_RISK_ON: 0,
} as const;

// ============================================================================
// Core Function
// ============================================================================

/**
 * Calculate a single combined penalty for sector and market regimes.
 * Uses "worst of" logic to prevent stacking penalties.
 * 
 * @param sectorRegime - Current sector regime
 * @param marketRegime - Current market regime
 * @returns Combined penalty result
 */
export function calculateRegimePenalty(
    sectorRegime: SectorRegime,
    marketRegime: MarketRegime
): RegimePenaltyResult {
    const sectorPenalty = getSectorPenalty(sectorRegime);
    const marketPenalty = getMarketPenalty(marketRegime);

    // Both are favorable - no penalty
    if (sectorPenalty === 0 && marketPenalty === 0) {
        return {
            penalty: 0,
            worstRegime: "NONE",
            explanation: "Both market and sector conditions are acceptable",
            hasPenalty: false,
        };
    }

    // Only sector is unfavorable
    if (sectorPenalty < 0 && marketPenalty === 0) {
        return {
            penalty: sectorPenalty,
            worstRegime: "SECTOR",
            explanation: `Sector conditions are unfavorable (${sectorRegime})`,
            hasPenalty: true,
        };
    }

    // Only market is unfavorable
    if (marketPenalty < 0 && sectorPenalty === 0) {
        return {
            penalty: marketPenalty,
            worstRegime: "MARKET",
            explanation: `Market conditions are unfavorable (${marketRegime})`,
            hasPenalty: true,
        };
    }

    // Both are unfavorable - use WORST (not sum)
    const worstPenalty = Math.min(sectorPenalty, marketPenalty);

    return {
        penalty: worstPenalty,
        worstRegime: "BOTH",
        explanation: `Both market (${marketRegime}) and sector (${sectorRegime}) conditions are unfavorable. Applying single worst penalty.`,
        hasPenalty: true,
    };
}

/**
 * Get sector-specific penalty
 */
function getSectorPenalty(regime: SectorRegime): number {
    switch (regime) {
        case "AVOID":
            return PENALTIES.SECTOR_AVOID;
        case "NEUTRAL":
            return PENALTIES.SECTOR_NEUTRAL;
        case "FAVORABLE":
            return PENALTIES.SECTOR_FAVORABLE;
        default:
            return 0;
    }
}

/**
 * Get market-specific penalty
 */
function getMarketPenalty(regime: MarketRegime): number {
    switch (regime) {
        case "RISK_OFF":
            return PENALTIES.MARKET_RISK_OFF;
        case "NEUTRAL":
            return PENALTIES.MARKET_NEUTRAL;
        case "RISK_ON":
            return PENALTIES.MARKET_RISK_ON;
        default:
            return 0;
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply regime penalty to a score (with floor at 0)
 */
export function applyRegimePenaltyToScore(
    score: number,
    sectorRegime: SectorRegime,
    marketRegime: MarketRegime
): {
    adjustedScore: number;
    penaltyResult: RegimePenaltyResult;
} {
    const penaltyResult = calculateRegimePenalty(sectorRegime, marketRegime);
    const adjustedScore = Math.max(0, score + penaltyResult.penalty);

    return {
        adjustedScore,
        penaltyResult,
    };
}

/**
 * Check if regimes should block action entirely
 */
export function shouldBlockAction(
    sectorRegime: SectorRegime,
    marketRegime: MarketRegime
): {
    blocked: boolean;
    reason: string | null;
} {
    // Block if market is risk-off (highest priority block)
    if (marketRegime === "RISK_OFF") {
        return {
            blocked: true,
            reason: "Market regime is Risk-Off",
        };
    }

    // Sector avoid alone doesn't block, but penalizes
    return {
        blocked: false,
        reason: null,
    };
}
