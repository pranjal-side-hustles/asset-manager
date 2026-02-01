/**
 * REGIME STABILITY GUARD
 * 
 * Phase 1 Lockdown: Prevent regime flip-flopping.
 * 
 * Rule: Regime change allowed only if new regime persists ≥ 3 trading days
 * 
 * This avoids:
 * - Daily mood swings
 * - User confusion
 * - Whiplash in decision-making
 */

import { isTradingDay } from "../infra/marketCalendar";

// ============================================================================
// Types
// ============================================================================

export type MarketRegime = "RISK_ON" | "NEUTRAL" | "RISK_OFF";

interface RegimeHistoryEntry {
    regime: MarketRegime;
    date: string;
    timestamp: number;
}

// ============================================================================
// Regime History Store
// ============================================================================

const STABILITY_THRESHOLD_DAYS = 3;
const regimeHistory: RegimeHistoryEntry[] = [];
let currentStableRegime: MarketRegime = "NEUTRAL";

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Evaluate whether a regime change should be applied
 * 
 * @param newRegime - The newly computed regime
 * @returns The regime that should be used (may be current stable if change not warranted)
 */
export function evaluateRegimeStability(
    newRegime: MarketRegime
): {
    regime: MarketRegime;
    isStable: boolean;
    daysAtNewRegime: number;
    reason: string;
} {
    const today = new Date();
    const todayStr = formatDate(today);

    // Add to history
    regimeHistory.push({
        regime: newRegime,
        date: todayStr,
        timestamp: Date.now(),
    });

    // Keep only last 10 days of history
    while (regimeHistory.length > 10) {
        regimeHistory.shift();
    }

    // If new regime matches current stable, nothing to do
    if (newRegime === currentStableRegime) {
        return {
            regime: currentStableRegime,
            isStable: true,
            daysAtNewRegime: countRecentDaysAtRegime(newRegime),
            reason: `Regime remains ${currentStableRegime}`,
        };
    }

    // Count how many consecutive trading days the new regime has appeared
    const daysAtNewRegime = countRecentDaysAtRegime(newRegime);

    if (daysAtNewRegime >= STABILITY_THRESHOLD_DAYS) {
        // Regime has persisted long enough, apply the change
        const oldRegime = currentStableRegime;
        currentStableRegime = newRegime;

        return {
            regime: newRegime,
            isStable: true,
            daysAtNewRegime,
            reason: `Regime changed from ${oldRegime} to ${newRegime} after ${daysAtNewRegime} days`,
        };
    } else {
        // Regime hasn't persisted long enough, keep current
        return {
            regime: currentStableRegime,
            isStable: false,
            daysAtNewRegime,
            reason: `New regime ${newRegime} detected (${daysAtNewRegime}/${STABILITY_THRESHOLD_DAYS} days), keeping ${currentStableRegime}`,
        };
    }
}

/**
 * Count consecutive trading days at the given regime (looking backwards)
 */
function countRecentDaysAtRegime(regime: MarketRegime): number {
    let count = 0;

    // Count from most recent backwards
    for (let i = regimeHistory.length - 1; i >= 0; i--) {
        if (regimeHistory[i].regime === regime) {
            count++;
        } else {
            break; // Streak broken
        }
    }

    return count;
}

/**
 * Get the current stable regime
 */
export function getCurrentStableRegime(): MarketRegime {
    return currentStableRegime;
}

/**
 * Get regime history for debugging
 */
export function getRegimeHistory(): RegimeHistoryEntry[] {
    return [...regimeHistory];
}

/**
 * Reset regime stability (for testing)
 */
export function resetRegimeStability(): void {
    regimeHistory.length = 0;
    currentStableRegime = "NEUTRAL";
}

/**
 * Get a human-readable regime explanation for UI
 */
export function getRegimeExplanation(regime: MarketRegime): string {
    switch (regime) {
        case "RISK_ON":
            return "Market conditions are favorable for growth opportunities.";
        case "NEUTRAL":
            return "Market conditions are mixed. Proceed with normal caution.";
        case "RISK_OFF":
            return "Market conditions are currently cautious, which limits new opportunities.";
        default:
            return "Market conditions are being evaluated.";
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
