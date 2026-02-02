/**
 * List View Filter Service
 * 
 * Provides filtered list views from the FULL tracked stock universe.
 * Separate from dashboard rotation - always queries fresh against universe.
 */

import type { DashboardStock } from "@shared/types";
import { getTrackedUniverse, type MarketCapCategory } from "./stockUniverse";
import { logger } from "../../infra/logging/logger";

// ============================================================================
// FILTER DEFINITIONS
// ============================================================================

export type ListViewFilter = "ready" | "watching" | "shape" | "force";

interface FilteredListResult {
    stocks: DashboardStock[];
    totalMatches: number;
    hasLimitedResults: boolean;
    message?: string;
}

// ============================================================================
// FILTER LOGIC
// ============================================================================

/**
 * Ready Now: FORCE ≥ 65, SHAPE ≥ 55, no risk blocks, market not Risk-Off
 */
function filterReadyNow(stocks: DashboardStock[], marketRegime: string): DashboardStock[] {
    return stocks.filter(s =>
        s.tacticalScore >= 65 &&
        s.strategicScore >= 55 &&
        s.decisionLabel?.label !== "PAUSE" &&
        marketRegime !== "RISK_OFF"
    ).sort((a, b) => b.tacticalScore - a.tacticalScore);
}

/**
 * Keep Watching: SHAPE ≥ 60 with developing FORCE or blocked conditions
 */
function filterKeepWatching(stocks: DashboardStock[], marketRegime: string): DashboardStock[] {
    return stocks.filter(s => {
        const strongShape = s.strategicScore >= 60;
        const developingForce = s.tacticalScore >= 40 && s.tacticalScore < 65;
        const forceBlockedByConfirmation = s.tacticalScore >= 65 && s.decisionLabel?.label === "KEEP_AN_EYE_ON";
        const forceBlockedByMarket = s.tacticalScore >= 65 && marketRegime === "RISK_OFF";
        return strongShape && (developingForce || forceBlockedByConfirmation || forceBlockedByMarket);
    }).sort((a, b) => b.strategicScore - a.strategicScore);
}

/**
 * Strong SHAPE: SHAPE ≥ 70 (regardless of FORCE)
 */
function filterStrongShape(stocks: DashboardStock[]): DashboardStock[] {
    return stocks.filter(s => s.strategicScore >= 70)
        .sort((a, b) => b.strategicScore - a.strategicScore);
}

/**
 * Strong FORCE: FORCE ≥ 70 (regardless of SHAPE)
 */
function filterStrongForce(stocks: DashboardStock[]): DashboardStock[] {
    return stocks.filter(s => s.tacticalScore >= 70)
        .sort((a, b) => b.tacticalScore - a.tacticalScore);
}

// ============================================================================
// DIVERSITY HELPERS
// ============================================================================

/**
 * Apply market cap diversity to filtered results.
 * Target: 2-3 Mega, 3-4 Large, 2-3 Mid, 1-2 Small
 */
function applyMarketCapDiversity(
    stocks: DashboardStock[],
    maxCount: number = 15
): DashboardStock[] {
    const universe = getTrackedUniverse();

    function getMarketCap(symbol: string): MarketCapCategory {
        const stock = universe.find(u => u.symbol === symbol);
        return stock?.marketCapCategory || "largeCap";
    }

    // Group by market cap
    const byMarketCap: Record<MarketCapCategory, DashboardStock[]> = {
        megaCap: [],
        largeCap: [],
        midCap: [],
        smallCap: [],
    };

    for (const stock of stocks) {
        const cap = getMarketCap(stock.symbol);
        byMarketCap[cap].push(stock);
    }

    // Target distribution
    const result: DashboardStock[] = [];

    // 2-3 mega
    result.push(...byMarketCap.megaCap.slice(0, 3));
    // 3-4 large
    result.push(...byMarketCap.largeCap.slice(0, 4));
    // 2-3 mid
    result.push(...byMarketCap.midCap.slice(0, 3));
    // 1-2 small
    result.push(...byMarketCap.smallCap.slice(0, 2));

    // If we don't have enough diversity, fill with remaining
    if (result.length < maxCount) {
        const remaining = stocks.filter(s => !result.find(r => r.symbol === s.symbol));
        result.push(...remaining.slice(0, maxCount - result.length));
    }

    return result.slice(0, maxCount);
}

// ============================================================================
// MAIN FILTER FUNCTION
// ============================================================================

/**
 * Get filtered list view results from full tracked universe.
 * 
 * @param filter - Which list view to show
 * @param allEvaluatedStocks - All stocks with evaluation data
 * @param marketRegime - Current market regime
 * @returns Filtered and diversified stock list
 */
export function getFilteredListView(
    filter: ListViewFilter,
    allEvaluatedStocks: DashboardStock[],
    marketRegime: string
): FilteredListResult {
    let filtered: DashboardStock[];

    switch (filter) {
        case "ready":
            filtered = filterReadyNow(allEvaluatedStocks, marketRegime);
            break;
        case "watching":
            filtered = filterKeepWatching(allEvaluatedStocks, marketRegime);
            break;
        case "shape":
            filtered = filterStrongShape(allEvaluatedStocks);
            break;
        case "force":
            filtered = filterStrongForce(allEvaluatedStocks);
            break;
        default:
            filtered = allEvaluatedStocks;
    }

    const totalMatches = filtered.length;
    const hasLimitedResults = totalMatches < 10 && totalMatches > 0;

    // Apply diversity and limit to 15
    const diversified = applyMarketCapDiversity(filtered, 15);

    logger.dataFetch(`List view '${filter}' returned ${diversified.length} stocks`, {
        filter,
        totalMatches,
        diversifiedCount: diversified.length,
    });

    return {
        stocks: diversified,
        totalMatches,
        hasLimitedResults,
        message: hasLimitedResults
            ? "Limited opportunities meet this criteria right now."
            : undefined,
    };
}

/**
 * Get all list view counts for summary tiles.
 */
export function getListViewCounts(
    allEvaluatedStocks: DashboardStock[],
    marketRegime: string
): Record<ListViewFilter, number> {
    return {
        ready: filterReadyNow(allEvaluatedStocks, marketRegime).length,
        watching: filterKeepWatching(allEvaluatedStocks, marketRegime).length,
        shape: filterStrongShape(allEvaluatedStocks).length,
        force: filterStrongForce(allEvaluatedStocks).length,
    };
}
