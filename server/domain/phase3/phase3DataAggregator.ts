/**
 * Phase 3: Data Aggregator
 * 
 * Collects data from existing providers to build Phase3Input.
 * Does NOT fetch new external data - uses existing snapshot + market context.
 */

import type { Phase3Input } from "@shared/types/phase3";
import type { StockSnapshot } from "@shared/types";
import type { MarketContext } from "@shared/types/marketContext";
import { fetchEarningsCalendar } from "../../services/providers/finnhub/fetchEarningsCalendar";
import { logger } from "../../infra/logging/logger";

// ============================================================================
// Build Phase3Input from existing data
// ============================================================================

export async function buildPhase3Input(
    snapshot: StockSnapshot,
    marketContext: MarketContext,
    sectorRegime: string
): Promise<Phase3Input> {
    const log = logger.withContext({ symbol: snapshot.symbol, engine: "phase3" });

    // Extract technical data from snapshot
    const currentPrice = snapshot.price;
    const ma50 = snapshot.technicals?.movingAverages?.ma50 ?? snapshot.price;
    const ma200 = snapshot.technicals?.movingAverages?.ma200 ?? snapshot.price;

    // Volume data - estimate avgVolume from historical if available
    const currentVolume = snapshot.volume ?? 0;
    let avgVolume = currentVolume;
    if (snapshot.historicalPrices && snapshot.historicalPrices.length >= 20) {
        const recentVolumes = snapshot.historicalPrices.slice(0, 20).map(p => p.volume);
        avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    }

    // ATR data from technicals
    const atrPercent = snapshot.technicals?.atrPercent ?? 2.0;
    // Previous ATR% - if not tracked, assume slightly higher for stable check
    const atrPercentPrev = atrPercent * 1.1;

    // Fetch earnings date (with caching)
    let daysToEarnings: number | undefined;
    try {
        const earningsData = await fetchEarningsCalendar(snapshot.symbol);
        daysToEarnings = earningsData?.daysToEarnings ?? undefined;
    } catch (error) {
        log.warn("DATA_FETCH", `Failed to fetch earnings: ${error}`);
        daysToEarnings = undefined;
    }

    return {
        currentPrice,
        ma50,
        ma200,
        currentVolume,
        avgVolume,
        atrPercent,
        atrPercentPrev,
        marketRegime: marketContext.regime,
        sectorRegime,
        daysToEarnings,
    };
}

// ============================================================================
// Convenience function for quick evaluation
// ============================================================================

import { getStockSnapshot } from "../../services/aggregation";
import { getMarketContext } from "../marketContext/marketContextEngine";
import { evaluateSectorRegime, type SectorInputs } from "../sectorRegime/sectorRegimeEngine";
import { evaluatePhase3Confirmation, type Phase3ConfirmationResult } from "./phase3Engine";

// Helper to derive sector inputs from market context
function deriveSectorInputsLocal(sector: string, context: MarketContext): SectorInputs {
    // Simple sector input derivation based on market context
    return {
        relativeStrength: context.regime === "RISK_ON" ? "UP" : context.regime === "RISK_OFF" ? "DOWN" : "FLAT",
        trendHealth: context.regime === "RISK_ON" ? "STRONG" : context.regime === "RISK_OFF" ? "WEAK" : "NEUTRAL",
        volatility: "NORMAL",
        macroAlignment: context.regime === "RISK_ON" ? "TAILWIND" : context.regime === "RISK_OFF" ? "HEADWIND" : "NEUTRAL",
    };
}

export async function evaluatePhase3ForSymbol(
    symbol: string
): Promise<Phase3ConfirmationResult | null> {
    const log = logger.withContext({ symbol, engine: "phase3" });

    try {
        // Get existing data (no new external calls except cached earnings)
        const [snapshot, marketContextSnapshot] = await Promise.all([
            getStockSnapshot(symbol.toUpperCase()),
            getMarketContext(),
        ]);

        if (!snapshot) {
            log.warn("DATA_FETCH", "No snapshot available for Phase 3");
            return null;
        }

        const marketContext = marketContextSnapshot.context;

        // Derive sector regime
        const sector = snapshot.sector ?? "Unknown";
        const sectorInputs = deriveSectorInputsLocal(sector, marketContext);
        const sectorResult = evaluateSectorRegime(sector, sectorInputs);

        // Build Phase3Input from existing data
        const phase3Input = await buildPhase3Input(
            snapshot,
            marketContext,
            sectorResult.regime
        );

        // Evaluate Phase 3
        const result = evaluatePhase3Confirmation(phase3Input);

        log.info("CONFIRMATION", `Phase 3: ${result.confirmationLevel} (${result.confirmationScore}/${result.maxPossibleScore} pts)`, {
            confirmations: result.confirmations.map(c => c.name).join(", "),
            blockers: result.blockers.map(b => b.name).join(", "),
        });

        return result;

    } catch (error) {
        log.error("DATA_FETCH", `Phase 3 evaluation failed: ${error}`);
        return null;
    }
}
