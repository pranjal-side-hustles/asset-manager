/**
 * Confirmation Engine
 * 
 * Aggregates all 5 confirmation layers and produces a unified confirmation result
 * that can be used to adjust Strategic Growth and Tactical Sentinel scores.
 */

import type {
    ConfirmationResult,
    ConfirmationLayerResult,
    ConfirmationFlag,
    OverallConfirmationSignal,
    StockConfirmationData,
    BreadthConfirmationData,
} from "@shared/types/confirmation";

import {
    evaluateBreadthLayer,
    evaluateInstitutionalLayer,
    evaluateOptionsLayer,
    evaluateSentimentLayer,
    evaluateEventsLayer,
} from "./layers";

import { logger } from "../../infra/logging/logger";

// ============================================================================
// Types
// ============================================================================

export interface ConfirmationEngineInput {
    symbol: string;
    data: StockConfirmationData;
    marketBreadth?: BreadthConfirmationData;
}

// ============================================================================
// Helper Functions
// ============================================================================

function determineOverallSignal(
    netAdjustment: number,
    layers: ConfirmationLayerResult[]
): OverallConfirmationSignal {
    const confirmingCount = layers.filter(l => l.signal === "CONFIRMING").length;
    const disconfirmingCount = layers.filter(l => l.signal === "DISCONFIRMING").length;

    // Strong signals require both high adjustment AND consistent layer agreement
    if (netAdjustment >= 8 && confirmingCount >= 4) {
        return "STRONG_CONFIRM";
    }
    if (netAdjustment <= -8 && disconfirmingCount >= 4) {
        return "STRONG_DISCONFIRM";
    }

    // Regular confirm/disconfirm
    if (netAdjustment >= 4 && confirmingCount >= 2) {
        return "CONFIRM";
    }
    if (netAdjustment <= -4 && disconfirmingCount >= 2) {
        return "DISCONFIRM";
    }

    // Weak signals
    if (netAdjustment > 0) {
        return "CONFIRM";
    }
    if (netAdjustment < 0) {
        return "DISCONFIRM";
    }

    return "NEUTRAL";
}

function createUnavailableLayerResult(
    layer: ConfirmationLayerResult["layer"]
): ConfirmationLayerResult {
    return {
        layer,
        signal: "NEUTRAL",
        confidence: "LOW",
        scoreAdjustment: 0,
        reasons: ["Data not available"],
        dataAvailable: false,
    };
}

// ============================================================================
// Main Engine
// ============================================================================

export function evaluateConfirmation(
    input: ConfirmationEngineInput
): ConfirmationResult {
    const { symbol, data, marketBreadth } = input;
    const log = logger.withContext({ symbol, engine: "confirmation" });
    const startTime = Date.now();

    const layers: ConfirmationLayerResult[] = [];
    const allFlags: ConfirmationFlag[] = [];

    // 1. Breadth Layer (uses market-wide data)
    const breadthData = marketBreadth || data.breadth;
    if (breadthData && breadthData.pctAbove200DMA !== undefined) {
        const breadthResult = evaluateBreadthLayer({ breadth: breadthData });
        layers.push(breadthResult);
    } else {
        layers.push(createUnavailableLayerResult("BREADTH"));
    }

    // 2. Institutional Layer
    if (data.institutional) {
        const { result, flags } = evaluateInstitutionalLayer({
            institutional: data.institutional
        });
        layers.push(result);
        allFlags.push(...flags);
    } else {
        layers.push(createUnavailableLayerResult("INSTITUTIONAL"));
    }

    // 3. Options Layer
    if (data.options && data.options.putCallRatio !== undefined) {
        const { result, flags } = evaluateOptionsLayer({ options: data.options });
        layers.push(result);
        allFlags.push(...flags);
    } else {
        layers.push(createUnavailableLayerResult("OPTIONS"));
    }

    // 4. Sentiment Layer
    if (data.sentiment && data.sentiment.analystRating !== undefined) {
        const { result, flags } = evaluateSentimentLayer({ sentiment: data.sentiment });
        layers.push(result);
        allFlags.push(...flags);
    } else {
        layers.push(createUnavailableLayerResult("SENTIMENT"));
    }

    // 5. Events Layer
    if (data.events) {
        const { result, flags } = evaluateEventsLayer({ events: data.events });
        layers.push(result);
        allFlags.push(...flags);
    } else {
        layers.push(createUnavailableLayerResult("EVENTS"));
    }

    // Calculate net adjustment (clamped to ±15)
    const rawNetAdjustment = layers.reduce(
        (sum, layer) => sum + layer.scoreAdjustment,
        0
    );
    const netAdjustment = Math.max(-15, Math.min(15, rawNetAdjustment));

    // Determine overall signal
    const overallSignal = determineOverallSignal(netAdjustment, layers);

    // Dedupe flags using Array.from for ES5 compatibility
    const uniqueFlags = Array.from(new Set(allFlags));

    const duration = Date.now() - startTime;

    log.engineEvaluation(
        `Confirmation complete: ${overallSignal} (net: ${netAdjustment >= 0 ? "+" : ""}${netAdjustment})`,
        {
            netAdjustment,
            overallSignal,
            confirmingLayers: layers.filter(l => l.signal === "CONFIRMING").length,
            disconfirmingLayers: layers.filter(l => l.signal === "DISCONFIRMING").length,
            flagCount: uniqueFlags.length,
            durationMs: duration,
        }
    );

    return {
        layers,
        netAdjustment,
        overallSignal,
        flags: uniqueFlags,
        evaluatedAt: Date.now(),
    };
}

// ============================================================================
// Data Aggregator (fetches all confirmation data for a symbol)
// ============================================================================

import { fetchMarketBreadth } from "../../services/market/fetchBreadth";
import { fetchFinnhubSentiment } from "../../services/providers/finnhub/fetchSentiment";
import { fetchFinnhubInstitutional } from "../../services/providers/finnhub/fetchInstitutional";
import { fetchFinnhubOptions } from "../../services/providers/finnhub/fetchOptions";
import { fetchEarningsCalendar } from "../../services/providers/finnhub/fetchEarningsCalendar";
import { fetchNews } from "../../services/providers/finnhub/fetchNews";

export async function fetchConfirmationData(
    symbol: string
): Promise<StockConfirmationData> {
    const log = logger.withContext({ symbol, provider: "confirmation" });

    log.info("DATA_FETCH", `Fetching confirmation data for ${symbol}`);

    // Fetch all data in parallel (with rate limiting handled by individual fetchers)
    const [
        breadthResult,
        sentimentData,
        institutionalData,
        optionsData,
        earningsData,
        newsData,
    ] = await Promise.all([
        fetchMarketBreadth(),
        fetchFinnhubSentiment(symbol),
        fetchFinnhubInstitutional(symbol),
        fetchFinnhubOptions(symbol),
        fetchEarningsCalendar(symbol),
        fetchNews(symbol),
    ]);

    // Build breadth confirmation data
    const breadth: BreadthConfirmationData = {
        pctAbove200DMA: breadthResult.breadth.pctAbove200DMA,
        advanceDeclineRatio: breadthResult.breadth.advanceDeclineRatio,
        newHighsLowsRatio: breadthResult.breadth.newHighsLowsRatio,
        health: breadthResult.breadth.health,
    };

    // Build institutional data
    const institutional = {
        institutionalOwnership: institutionalData?.institutionalOwnership,
        institutionalTrend: institutionalData?.institutionalTrend || "FLAT" as const,
        topHolders: institutionalData?.topHolders || [],
    };

    // Build options data
    const options = {
        putCallRatio: optionsData?.putCallRatio ?? 1.0,
        totalOpenInterest: optionsData?.totalOpenInterest ?? 0,
        callOpenInterest: optionsData?.callOpenInterest ?? 0,
        putOpenInterest: optionsData?.putOpenInterest ?? 0,
        impliedVolatility: optionsData?.impliedVolatility,
        ivRank: optionsData?.ivRank,
    };

    // Build sentiment data
    const sentiment = {
        analystRating: sentimentData?.analystRating ?? 3.0,
        analystPriceTarget: sentimentData?.analystPriceTarget,
        insiderBuying: sentimentData?.insiderBuying ?? false,
        recommendationTrend: sentimentData?.recommendationTrend || {
            buy: 0,
            hold: 0,
            sell: 0,
        },
        newsScore: newsData?.sentimentScore,
    };

    // Build events data
    const events = {
        daysToEarnings: earningsData?.daysToEarnings ?? undefined,
        daysToExDividend: undefined, // Not available from this endpoint
        hasUpcomingNews: newsData?.hasRecentNews ?? false,
        recentNewsCount: newsData?.recentNewsCount ?? 0,
        nextEarningsDate: earningsData?.nextEarningsDate ?? undefined,
    };

    return {
        breadth,
        institutional,
        options,
        sentiment,
        events,
    };
}

// ============================================================================
// Convenience function: Evaluate confirmation for a symbol
// ============================================================================

export async function evaluateConfirmationForSymbol(
    symbol: string
): Promise<ConfirmationResult> {
    const data = await fetchConfirmationData(symbol);
    return evaluateConfirmation({ symbol, data });
}
