/**
 * Dashboard Stock Rotation Service
 * 
 * Curates a 6-stock snapshot from the broader tracked universe.
 * Selection is bucket-based with diversity and stability constraints.
 */

import { logger } from "../../infra/logging/logger";
import type { DashboardStock } from "@shared/types";
import { getTrackedUniverse, type MarketCapCategory } from "./stockUniverse";

// ============================================================================
// TYPES
// ============================================================================

interface RotationCandidate {
    stock: DashboardStock;
    bucket: "ready" | "watching" | "shape" | "force";
    priority: number;
}

interface RotationState {
    selectedSymbols: string[];
    lastRotation: Date;
    bucketAssignments: Record<string, "ready" | "watching" | "shape" | "force">;
}

// In-memory state (would be persisted in production)
let rotationState: RotationState | null = null;

// ============================================================================
// BUCKET DEFINITIONS
// ============================================================================

/**
 * Check if stock qualifies for "Ready Now" bucket.
 * FORCE ≥ 65, SHAPE ≥ 55, no risk blocks, market not Risk-Off
 */
function isReadyNow(stock: DashboardStock, marketRegime: string): boolean {
    return (
        stock.tacticalScore >= 65 &&
        stock.strategicScore >= 55 &&
        stock.decisionLabel?.label !== "PAUSE" &&
        marketRegime !== "RISK_OFF"
    );
}

/**
 * Check if stock qualifies for "Keep Watching" bucket.
 * SHAPE ≥ 60 with developing FORCE or blocked conditions
 */
function isKeepWatching(stock: DashboardStock, marketRegime: string): boolean {
    const strongShape = stock.strategicScore >= 60;
    const developingForce = stock.tacticalScore >= 40 && stock.tacticalScore < 65;
    const forceBlockedByConfirmation = stock.tacticalScore >= 65 && stock.decisionLabel?.label === "KEEP_AN_EYE_ON";
    const forceBlockedByMarket = stock.tacticalScore >= 65 && marketRegime === "RISK_OFF";
    return strongShape && (developingForce || forceBlockedByConfirmation || forceBlockedByMarket);
}

/**
 * Check if stock qualifies for "Strong SHAPE" bucket (even if FORCE is weak).
 */
function isStrongShape(stock: DashboardStock): boolean {
    return stock.strategicScore >= 70;
}

/**
 * Check if stock qualifies for "Strong FORCE" bucket (even if SHAPE is weak).
 */
function isStrongForce(stock: DashboardStock): boolean {
    return stock.tacticalScore >= 70;
}

// ============================================================================
// DIVERSITY HELPERS
// ============================================================================

/**
 * Get sector for a stock.
 */
function getSector(stock: DashboardStock): string {
    return stock.sector || "Unknown";
}

/**
 * Get market cap category for a stock.
 */
function getMarketCap(stock: DashboardStock): MarketCapCategory {
    // Infer from universe or use heuristics
    const universeStock = getTrackedUniverse().find(u => u.symbol === stock.symbol);
    return universeStock?.marketCapCategory || "largeCap";
}

/**
 * Check if adding a stock would violate diversity constraints.
 */
function wouldViolateDiversity(
    stock: DashboardStock,
    currentSelection: DashboardStock[]
): boolean {
    if (currentSelection.length < 3) return false; // Too early to enforce

    const newSector = getSector(stock);
    const newCap = getMarketCap(stock);

    // Count current sectors and caps
    const sectorCounts: Record<string, number> = {};
    const capCounts: Record<string, number> = {};

    for (const s of currentSelection) {
        const sector = getSector(s);
        const cap = getMarketCap(s);
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
        capCounts[cap] = (capCounts[cap] || 0) + 1;
    }

    // Don't allow more than 3 from same sector
    if ((sectorCounts[newSector] || 0) >= 3) return true;

    // Don't allow more than 3 from same market cap
    if ((capCounts[newCap] || 0) >= 3) return true;

    return false;
}

// ============================================================================
// PRIORITIZATION
// ============================================================================

/**
 * Calculate priority score for ranking within bucket.
 * Higher is better.
 */
function calculatePriority(stock: DashboardStock, bucket: string): number {
    let priority = 0;

    // Base score contribution
    switch (bucket) {
        case "ready":
            priority = stock.tacticalScore * 2 + stock.strategicScore;
            break;
        case "watching":
            priority = stock.strategicScore * 2 + stock.tacticalScore;
            break;
        case "shape":
            priority = stock.strategicScore * 3;
            break;
        case "force":
            priority = stock.tacticalScore * 3;
            break;
    }

    // Bonus for positive momentum (improving trend)
    if (stock.changePercent > 0) {
        priority += 10;
    }

    // Bonus for favorable sector regime
    if (stock.sectorRegime === "FAVORED") {
        priority += 15;
    }

    return priority;
}

// ============================================================================
// STABILITY LOGIC
// ============================================================================

/**
 * Check if we should rotate today.
 * Only rotate once per trading day.
 */
function shouldRotateToday(): boolean {
    if (!rotationState) return true;

    const lastRotation = rotationState.lastRotation;
    const today = new Date();

    // Check if same trading day (simple: same calendar day)
    return (
        lastRotation.getFullYear() !== today.getFullYear() ||
        lastRotation.getMonth() !== today.getMonth() ||
        lastRotation.getDate() !== today.getDate()
    );
}

/**
 * Apply stability constraints - limit churn to 2-3 stocks max.
 */
function applyStabilityConstraints(
    newSelection: DashboardStock[],
    previousSelection: string[]
): DashboardStock[] {
    if (previousSelection.length === 0) return newSelection;

    const MAX_CHURN = 3;
    let churnCount = 0;
    const stableSelection: DashboardStock[] = [];

    // First, try to keep stocks that still qualify
    const retained = newSelection.filter(s => previousSelection.includes(s.symbol));
    stableSelection.push(...retained);

    // Then add new stocks up to churn limit
    for (const stock of newSelection) {
        if (stableSelection.length >= 6) break;
        if (stableSelection.find(s => s.symbol === stock.symbol)) continue;

        if (churnCount < MAX_CHURN) {
            stableSelection.push(stock);
            churnCount++;
        }
    }

    // If we don't have 6, fill with remaining from new selection
    for (const stock of newSelection) {
        if (stableSelection.length >= 6) break;
        if (!stableSelection.find(s => s.symbol === stock.symbol)) {
            stableSelection.push(stock);
        }
    }

    return stableSelection.slice(0, 6);
}

// ============================================================================
// MAIN ROTATION LOGIC
// ============================================================================

/**
 * Select 6 stocks for dashboard display.
 * 
 * Bucket allocation:
 * - 1-2 from Ready Now
 * - 2 from Keep Watching
 * - 1 from Strong SHAPE
 * - 1 from Strong FORCE
 */
export function selectDashboardStocks(
    allEvaluatedStocks: DashboardStock[],
    marketRegime: string
): DashboardStock[] {
    // Check if we should rotate
    const previousSelection = rotationState?.selectedSymbols || [];

    // Categorize stocks into buckets
    const readyNow: RotationCandidate[] = [];
    const keepWatching: RotationCandidate[] = [];
    const strongShape: RotationCandidate[] = [];
    const strongForce: RotationCandidate[] = [];

    for (const stock of allEvaluatedStocks) {
        if (isReadyNow(stock, marketRegime)) {
            readyNow.push({
                stock,
                bucket: "ready",
                priority: calculatePriority(stock, "ready"),
            });
        }
        if (isKeepWatching(stock, marketRegime)) {
            keepWatching.push({
                stock,
                bucket: "watching",
                priority: calculatePriority(stock, "watching"),
            });
        }
        if (isStrongShape(stock)) {
            strongShape.push({
                stock,
                bucket: "shape",
                priority: calculatePriority(stock, "shape"),
            });
        }
        if (isStrongForce(stock)) {
            strongForce.push({
                stock,
                bucket: "force",
                priority: calculatePriority(stock, "force"),
            });
        }
    }

    // Sort each bucket by priority (highest first)
    readyNow.sort((a, b) => b.priority - a.priority);
    keepWatching.sort((a, b) => b.priority - a.priority);
    strongShape.sort((a, b) => b.priority - a.priority);
    strongForce.sort((a, b) => b.priority - a.priority);

    // Build selection with diversity constraints
    const selected: DashboardStock[] = [];
    const usedSymbols = new Set<string>();

    function addFromBucket(candidates: RotationCandidate[], count: number): number {
        let added = 0;
        for (const candidate of candidates) {
            if (selected.length >= 6) break;
            if (added >= count) break;
            if (usedSymbols.has(candidate.stock.symbol)) continue;
            if (wouldViolateDiversity(candidate.stock, selected)) continue;

            selected.push(candidate.stock);
            usedSymbols.add(candidate.stock.symbol);
            added++;
        }
        return added;
    }

    // Fill buckets in order (with fallbacks)
    // A. 1-2 from Ready Now
    const readyAdded = addFromBucket(readyNow, 2);

    // B. 2 from Keep Watching
    const watchingAdded = addFromBucket(keepWatching, 2);

    // C. 1 from Strong SHAPE
    const shapeAdded = addFromBucket(strongShape, 1);

    // D. 1 from Strong FORCE
    const forceAdded = addFromBucket(strongForce, 1);

    // Fill remaining slots from Keep Watching (fallback)
    if (selected.length < 6) {
        addFromBucket(keepWatching, 6 - selected.length);
    }

    // If still not full, add any remaining candidates
    if (selected.length < 6) {
        const allCandidates = [...readyNow, ...keepWatching, ...strongShape, ...strongForce]
            .sort((a, b) => b.priority - a.priority);
        addFromBucket(allCandidates, 6 - selected.length);
    }

    // Apply stability constraints if not first rotation
    let finalSelection = selected;
    if (!shouldRotateToday() && previousSelection.length > 0) {
        // Keep previous selection if within same day
        const previousStocks = allEvaluatedStocks.filter(s =>
            previousSelection.includes(s.symbol)
        );
        if (previousStocks.length >= 6) {
            finalSelection = previousStocks.slice(0, 6);
        }
    } else if (previousSelection.length > 0) {
        // Apply stability (max churn) on new day
        finalSelection = applyStabilityConstraints(selected, previousSelection);
    }

    // Update rotation state
    rotationState = {
        selectedSymbols: finalSelection.map(s => s.symbol),
        lastRotation: new Date(),
        bucketAssignments: {},
    };

    logger.dataFetch(`Dashboard rotation selected ${finalSelection.length} stocks`, {
        readyNow: readyAdded,
        watching: watchingAdded,
        shape: shapeAdded,
        force: forceAdded,
        totalCandidates: allEvaluatedStocks.length,
    });

    return finalSelection;
}

/**
 * Get current rotation state (for debugging/monitoring).
 */
export function getRotationState(): RotationState | null {
    return rotationState;
}

/**
 * Force a rotation (for testing or manual override).
 */
export function forceRotation(): void {
    rotationState = null;
}
