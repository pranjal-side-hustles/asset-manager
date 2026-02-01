/**
 * Phase 4: Data Aggregator
 * 
 * Builds Phase4Input from existing stock snapshot and phase results.
 * Does NOT make new API calls - uses cached data from prior phases.
 */

import type { Phase4Input, Phase4Result } from "@shared/types/phase4";
import type { StockSnapshot } from "@shared/types";
import type { ConfirmationLevel } from "@shared/types/phase3";
import { evaluatePhase4Playbooks } from "./phase4Engine";
import { getStockSnapshot } from "../../services/aggregation";
import { getMarketContext } from "../marketContext/marketContextEngine";
import { evaluatePhase3ForSymbol } from "../phase3";
import { evaluateSectorRegime, type SectorInputs } from "../sectorRegime/sectorRegimeEngine";
import { fetchStockEvaluation, type ExtendedStockEvaluationResponse } from "../../services/stocks/fetchStock";
import { logger } from "../../infra/logging/logger";
import { logPlaybookInstance } from "../playbookTracking";

// ============================================================================
// Build Phase4Input from existing data
// ============================================================================

export function buildPhase4Input(
    snapshot: StockSnapshot,
    evaluation: ExtendedStockEvaluationResponse,
    confirmationLevel: ConfirmationLevel,
    confirmationScore: number
): Phase4Input {
    const technicals = snapshot.technicals;

    return {
        // From Phase 2 scores
        strategicScore: evaluation.evaluation.strategicGrowth.score,
        tacticalScore: evaluation.evaluation.tacticalSentinel.score,
        strategicStatus: evaluation.evaluation.strategicGrowth.status,
        tacticalStatus: evaluation.evaluation.tacticalSentinel.status,

        // From Phase 3 confirmation
        confirmationLevel,
        confirmationScore,

        // Technical context
        priceVsMa50: technicals?.priceVsMA50 ?? 0,
        priceVsMa200: technicals?.priceVsMA200 ?? 0,
        rsi: technicals?.rsi ?? 50,
        weeklyTrend: technicals?.weeklyTrend ?? "SIDEWAYS",
        dailyTrend: technicals?.dailyTrend ?? "SIDEWAYS",

        // Volatility
        atrPercent: technicals?.atrPercent ?? 2,

        // Market context
        marketRegime: evaluation.marketRegime ?? "NEUTRAL",

        // Optional fields (derived from price action if available)
        recentPullbackPct: calculatePullback(snapshot),
        daysInBase: undefined, // Would need historical tracking
        nearResistance: checkNearResistance(snapshot),
    };
}

// ============================================================================
// Helper functions
// ============================================================================

function calculatePullback(snapshot: StockSnapshot): number | undefined {
    if (!snapshot.historicalPrices || snapshot.historicalPrices.length < 20) {
        return undefined;
    }

    // Find the high in the last 20 days
    const recentHigh = Math.max(...snapshot.historicalPrices.slice(0, 20).map(p => p.high));
    const currentPrice = snapshot.price;

    if (recentHigh > 0) {
        return ((recentHigh - currentPrice) / recentHigh) * 100;
    }

    return undefined;
}

function checkNearResistance(snapshot: StockSnapshot): boolean {
    if (!snapshot.historicalPrices || snapshot.historicalPrices.length < 50) {
        return false;
    }

    // Simple resistance check: is current price within 2% of 50-day high?
    const fiftyDayHigh = Math.max(...snapshot.historicalPrices.slice(0, 50).map(p => p.high));
    const currentPrice = snapshot.price;

    return currentPrice >= fiftyDayHigh * 0.98;
}

// Helper to derive sector regime
function deriveSectorRegime(sector: string, marketRegime: string): string {
    // Simple derivation - in production would use real sector data
    if (marketRegime === "RISK_ON") return "FAVORABLE";
    if (marketRegime === "RISK_OFF") return "UNFAVORABLE";
    return "NEUTRAL";
}

// ============================================================================
// Convenience function: Evaluate Phase 4 for a symbol
// ============================================================================

export async function evaluatePhase4ForSymbol(
    symbol: string
): Promise<Phase4Result | null> {
    const log = logger.withContext({ symbol, engine: "phase4" });

    try {
        // Get all required data from existing phases
        const [snapshot, evaluation, phase3Result] = await Promise.all([
            getStockSnapshot(symbol.toUpperCase()),
            fetchStockEvaluation(symbol),
            evaluatePhase3ForSymbol(symbol),
        ]);

        if (!snapshot || !evaluation) {
            log.warn("DATA_FETCH", "No snapshot or evaluation available for Phase 4");
            return null;
        }

        // Default confirmation if Phase 3 failed
        const confirmationLevel = phase3Result?.confirmationLevel ?? "NONE";
        const confirmationScore = phase3Result?.confirmationScore ?? 0;

        // Build Phase4Input
        const phase4Input = buildPhase4Input(
            snapshot,
            evaluation,
            confirmationLevel,
            confirmationScore
        );

        // Evaluate Phase 4
        const result = evaluatePhase4Playbooks(phase4Input);

        // Log playbook instance for tracking (SURVIVORSHIP BIAS FREE)
        // This logs EVERY time a playbook is shown, not when user takes action
        if (result.activePlaybook) {
            const sectorRegime = deriveSectorRegime(
                snapshot.sector ?? "Unknown",
                evaluation.marketRegime ?? "NEUTRAL"
            );

            // Fire and forget - don't block on logging
            logPlaybookInstance(
                symbol.toUpperCase(),
                result.activePlaybook.name,
                snapshot.price,
                evaluation.marketRegime ?? "NEUTRAL",
                sectorRegime,
                confirmationLevel,
                result.activePlaybook.matchConfidence
            ).catch(err => {
                log.warn("DATA_FETCH", `Failed to log playbook instance: ${err}`);
            });

            log.info("CONFIRMATION", `Phase 4: ${result.activePlaybook.title} (${result.activePlaybook.matchConfidence}% match)`, {
                playbook: result.activePlaybook.name,
                matchedRules: result.activePlaybook.matchedRules.join(", "),
            });
        } else {
            log.info("CONFIRMATION", "Phase 4: No playbook matched", {
                considered: result.consideredPlaybooks.map(p => `${p.name}(${p.matchScore})`).join(", "),
            });
        }

        return result;

    } catch (error) {
        log.error("DATA_FETCH", `Phase 4 evaluation failed: ${error}`);
        return null;
    }
}

