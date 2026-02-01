/**
 * CONFIRMATION COOLDOWN
 * 
 * Phase 3 Lockdown: Prevent confirmation spam.
 * 
 * Rule: Once STRONG confirmation appears, do not downgrade unless conditions worsen materially.
 * 
 * This avoids whiplash.
 */

import type { ConfirmationLevel } from "@shared/types/phase3";

// ============================================================================
// Types
// ============================================================================

interface ConfirmationCacheEntry {
    level: ConfirmationLevel;
    score: number;
    timestamp: number;
    date: string;
}

// ============================================================================
// Cooldown Store (per-symbol)
// ============================================================================

const confirmationCache: Map<string, ConfirmationCacheEntry> = new Map();

// Cooldown duration: 24 hours
const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000;

// Minimum score drop required to downgrade from STRONG
const MATERIAL_SCORE_DROP = 3;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Evaluate whether a confirmation level change should be applied
 * 
 * @param symbol - Stock symbol
 * @param newLevel - The newly computed confirmation level
 * @param newScore - The new confirmation score
 * @returns The level that should be displayed
 */
export function evaluateConfirmationCooldown(
    symbol: string,
    newLevel: ConfirmationLevel,
    newScore: number
): {
    level: ConfirmationLevel;
    wasModified: boolean;
    reason: string;
} {
    const upperSymbol = symbol.toUpperCase();
    const cached = confirmationCache.get(upperSymbol);
    const now = Date.now();

    // Record the new confirmation
    const newEntry: ConfirmationCacheEntry = {
        level: newLevel,
        score: newScore,
        timestamp: now,
        date: new Date().toISOString().split("T")[0],
    };

    // No cache or expired cache - use new level
    if (!cached || (now - cached.timestamp) > COOLDOWN_DURATION_MS) {
        confirmationCache.set(upperSymbol, newEntry);
        return {
            level: newLevel,
            wasModified: false,
            reason: "New confirmation evaluation",
        };
    }

    // Same level - just update cache
    if (cached.level === newLevel) {
        confirmationCache.set(upperSymbol, newEntry);
        return {
            level: newLevel,
            wasModified: false,
            reason: `Confirmation remains ${newLevel}`,
        };
    }

    // Upgrading is always allowed
    if (isUpgrade(cached.level, newLevel)) {
        confirmationCache.set(upperSymbol, newEntry);
        return {
            level: newLevel,
            wasModified: false,
            reason: `Confirmation upgraded from ${cached.level} to ${newLevel}`,
        };
    }

    // Attempting to downgrade from STRONG
    if (cached.level === "STRONG") {
        // Only allow downgrade if score dropped materially
        const scoreDrop = cached.score - newScore;

        if (scoreDrop >= MATERIAL_SCORE_DROP) {
            confirmationCache.set(upperSymbol, newEntry);
            return {
                level: newLevel,
                wasModified: false,
                reason: `STRONG downgraded to ${newLevel} due to material score drop (${cached.score} → ${newScore})`,
            };
        } else {
            // Prevent whiplash - keep STRONG
            return {
                level: "STRONG",
                wasModified: true,
                reason: `Keeping STRONG (score drop of ${scoreDrop} pts is below ${MATERIAL_SCORE_DROP} pt threshold)`,
            };
        }
    }

    // Other downgrades (WEAK → NONE) are allowed
    confirmationCache.set(upperSymbol, newEntry);
    return {
        level: newLevel,
        wasModified: false,
        reason: `Confirmation changed from ${cached.level} to ${newLevel}`,
    };
}

/**
 * Check if a level change is an upgrade
 */
function isUpgrade(from: ConfirmationLevel, to: ConfirmationLevel): boolean {
    const order = { "NONE": 0, "WEAK": 1, "STRONG": 2 };
    return order[to] > order[from];
}

/**
 * Get current cached confirmation for a symbol
 */
export function getCachedConfirmation(symbol: string): ConfirmationCacheEntry | null {
    return confirmationCache.get(symbol.toUpperCase()) || null;
}

/**
 * Clear confirmation cache for a symbol
 */
export function clearConfirmationCache(symbol: string): void {
    confirmationCache.delete(symbol.toUpperCase());
}

/**
 * Clear all confirmation caches
 */
export function clearAllConfirmationCaches(): void {
    confirmationCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getConfirmationCacheStats(): {
    symbolCount: number;
    symbols: string[];
} {
    return {
        symbolCount: confirmationCache.size,
        symbols: Array.from(confirmationCache.keys()),
    };
}
