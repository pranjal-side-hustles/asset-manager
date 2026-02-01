/**
 * Playbook Instance Logger
 * 
 * Logs every playbook instance when it is SHOWN.
 * This is the entry point for tracking - called whenever Phase 4 returns a playbook.
 */

import type {
    PlaybookInstance,
    PlaybookOutcome,
    PlaybookTrackingStore,
    HorizonOutcome,
    OutcomeHorizon,
    PlaybookAggregateMetrics,
    HorizonMetrics,
} from "@shared/types/playbookTracking";

import type { PlaybookName } from "@shared/types/phase4";
import type { ConfirmationLevel } from "@shared/types/phase3";
import { OUTCOME_HORIZONS } from "@shared/types/playbookTracking";
import { logger } from "../../infra/logging/logger";

// ============================================================================
// In-Memory Store (Replace with database for persistence)
// ============================================================================

class InMemoryPlaybookStore implements PlaybookTrackingStore {
    private instances: Map<string, PlaybookInstance> = new Map();
    private outcomes: Map<string, PlaybookOutcome> = new Map();

    async saveInstance(instance: PlaybookInstance): Promise<void> {
        this.instances.set(instance.id, instance);
    }

    async getInstancesByPlaybook(playbookId: PlaybookName): Promise<PlaybookInstance[]> {
        return Array.from(this.instances.values())
            .filter(i => i.playbookId === playbookId);
    }

    async getPendingOutcomes(): Promise<PlaybookInstance[]> {
        const now = Date.now();
        const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

        return Array.from(this.instances.values())
            .filter(instance => {
                // Only check instances old enough for at least 5-day outcome
                if (now - instance.timestamp < fiveDaysMs) {
                    return false;
                }

                const outcome = this.outcomes.get(instance.id);
                if (!outcome) return true;

                // Check if any horizon is still pending
                return Object.values(outcome.horizons).some(h => h.status === "PENDING");
            });
    }

    async saveOutcome(outcome: PlaybookOutcome): Promise<void> {
        this.outcomes.set(outcome.instanceId, outcome);
    }

    async getOutcome(instanceId: string): Promise<PlaybookOutcome | null> {
        return this.outcomes.get(instanceId) || null;
    }

    async getOutcomesByPlaybook(playbookId: PlaybookName): Promise<PlaybookOutcome[]> {
        const instances = await this.getInstancesByPlaybook(playbookId);
        const outcomes: PlaybookOutcome[] = [];

        for (const instance of instances) {
            const outcome = this.outcomes.get(instance.id);
            if (outcome) {
                outcomes.push(outcome);
            }
        }

        return outcomes;
    }

    // Debug helpers
    getStats() {
        return {
            totalInstances: this.instances.size,
            totalOutcomes: this.outcomes.size,
        };
    }
}

// Singleton store instance
const store = new InMemoryPlaybookStore();

// ============================================================================
// Instance Logger (Called when playbook is SHOWN)
// ============================================================================

export async function logPlaybookInstance(
    symbol: string,
    playbookId: PlaybookName,
    priceAtSignal: number,
    marketRegime: string,
    sectorRegime: string,
    confirmationLevel: ConfirmationLevel,
    matchConfidence: number
): Promise<PlaybookInstance> {
    const now = Date.now();
    const date = new Date(now).toISOString().split("T")[0];

    const instance: PlaybookInstance = {
        id: `${playbookId}-${symbol}-${now}`,
        symbol,
        playbookId,
        timestamp: now,
        date,
        priceAtSignal,
        marketRegime,
        sectorRegime,
        confirmationLevel,
        matchConfidence,
    };

    await store.saveInstance(instance);

    logger.withContext({ symbol }).info(
        "CONFIRMATION",
        `Playbook instance logged: ${playbookId} @ $${priceAtSignal.toFixed(2)}`
    );

    return instance;
}

// ============================================================================
// Outcome Computer (Called periodically to update outcomes)
// ============================================================================

interface EODPriceData {
    date: string;
    close: number;
    high: number;
    low: number;
}

export async function computeOutcomes(
    getHistoricalPrices: (symbol: string, startDate: string, days: number) => Promise<EODPriceData[]>
): Promise<number> {
    const pendingInstances = await store.getPendingOutcomes();
    let computedCount = 0;

    for (const instance of pendingInstances) {
        try {
            // Get historical prices from signal date
            const prices = await getHistoricalPrices(instance.symbol, instance.date, 70);

            if (prices.length < 5) {
                // Mark as insufficient data
                const outcome = createInsufficientOutcome(instance.id);
                await store.saveOutcome(outcome);
                continue;
            }

            // Compute outcomes for each horizon
            const horizons = {} as Record<OutcomeHorizon, HorizonOutcome>;

            for (const horizon of OUTCOME_HORIZONS) {
                horizons[horizon] = computeHorizonOutcome(
                    instance.priceAtSignal,
                    prices,
                    horizon
                );
            }

            const outcome: PlaybookOutcome = {
                instanceId: instance.id,
                horizons,
                computedAt: Date.now(),
            };

            await store.saveOutcome(outcome);
            computedCount++;

        } catch (error) {
            logger.withContext({ symbol: instance.symbol }).warn(
                "DATA_FETCH",
                `Failed to compute outcome for ${instance.id}: ${error}`
            );
        }
    }

    return computedCount;
}

function computeHorizonOutcome(
    priceAtSignal: number,
    prices: EODPriceData[],
    horizon: OutcomeHorizon
): HorizonOutcome {
    // Check if we have enough data
    if (prices.length < horizon) {
        return {
            horizon,
            status: horizon <= prices.length ? "PENDING" : "INSUFFICIENT_DATA",
            returnPct: null,
            priceAtHorizon: null,
            dateAtHorizon: null,
            maxDrawdownPct: null,
        };
    }

    const priceAtHorizon = prices[horizon - 1].close;
    const returnPct = ((priceAtHorizon - priceAtSignal) / priceAtSignal) * 100;

    // Calculate max drawdown during the period
    let maxDrawdownPct = 0;
    let peakPrice = priceAtSignal;

    for (let i = 0; i < horizon && i < prices.length; i++) {
        const lowPrice = prices[i].low;
        peakPrice = Math.max(peakPrice, prices[i].high);
        const drawdown = ((peakPrice - lowPrice) / peakPrice) * 100;
        maxDrawdownPct = Math.max(maxDrawdownPct, drawdown);
    }

    return {
        horizon,
        status: "COMPUTED",
        returnPct,
        priceAtHorizon,
        dateAtHorizon: prices[horizon - 1].date,
        maxDrawdownPct,
    };
}

function createInsufficientOutcome(instanceId: string): PlaybookOutcome {
    const horizons = {} as Record<OutcomeHorizon, HorizonOutcome>;

    for (const horizon of OUTCOME_HORIZONS) {
        horizons[horizon] = {
            horizon,
            status: "INSUFFICIENT_DATA",
            returnPct: null,
            priceAtHorizon: null,
            dateAtHorizon: null,
            maxDrawdownPct: null,
        };
    }

    return {
        instanceId,
        horizons,
        computedAt: Date.now(),
    };
}

// ============================================================================
// Aggregate Metrics Computer
// ============================================================================

export async function computeAggregateMetrics(
    playbookId: PlaybookName
): Promise<PlaybookAggregateMetrics | null> {
    const instances = await store.getInstancesByPlaybook(playbookId);

    if (instances.length === 0) {
        return null;
    }

    const outcomes = await store.getOutcomesByPlaybook(playbookId);

    // Collect returns by horizon
    const returnsByHorizon: Record<OutcomeHorizon, { returns: number[]; drawdowns: number[] }> = {
        5: { returns: [], drawdowns: [] },
        20: { returns: [], drawdowns: [] },
        60: { returns: [], drawdowns: [] },
    };

    for (const outcome of outcomes) {
        for (const horizon of OUTCOME_HORIZONS) {
            const h = outcome.horizons[horizon];
            if (h.status === "COMPUTED" && h.returnPct !== null) {
                returnsByHorizon[horizon].returns.push(h.returnPct);
                if (h.maxDrawdownPct !== null) {
                    returnsByHorizon[horizon].drawdowns.push(h.maxDrawdownPct);
                }
            }
        }
    }

    // Compute metrics for each horizon
    const horizonMetrics = {} as Record<OutcomeHorizon, HorizonMetrics>;
    const instancesWithData = {} as Record<OutcomeHorizon, number>;

    for (const horizon of OUTCOME_HORIZONS) {
        const { returns, drawdowns } = returnsByHorizon[horizon];
        instancesWithData[horizon] = returns.length;
        horizonMetrics[horizon] = computeHorizonMetrics(horizon, returns, drawdowns);
    }

    // Get date range
    const dates = instances.map(i => i.date).sort();

    return {
        playbookId,
        totalInstances: instances.length,
        instancesWithData,
        horizonMetrics,
        dateRange: {
            earliest: dates[0],
            latest: dates[dates.length - 1],
        },
        computedAt: Date.now(),
    };
}

function computeHorizonMetrics(
    horizon: OutcomeHorizon,
    returns: number[],
    drawdowns: number[]
): HorizonMetrics {
    if (returns.length === 0) {
        return {
            horizon,
            sampleSize: 0,
            medianReturnPct: null,
            positiveOutcomePct: null,
            drawdownFrequencyPct: null,
            dispersionIQR: null,
            returnPct25: null,
            returnPct75: null,
            worstReturnPct: null,
        };
    }

    // Sort returns for percentile calculations
    const sorted = [...returns].sort((a, b) => a - b);

    // Median (50th percentile)
    const medianReturnPct = percentile(sorted, 50);

    // % positive
    const positiveCount = returns.filter(r => r > 0).length;
    const positiveOutcomePct = (positiveCount / returns.length) * 100;

    // Drawdown frequency (% of instances with >5% drawdown)
    const significantDrawdowns = drawdowns.filter(d => d > 5).length;
    const drawdownFrequencyPct = drawdowns.length > 0
        ? (significantDrawdowns / drawdowns.length) * 100
        : null;

    // IQR (75th - 25th percentile)
    const returnPct25 = percentile(sorted, 25);
    const returnPct75 = percentile(sorted, 75);
    const dispersionIQR = returnPct75 - returnPct25;

    // Worst outcome
    const worstReturnPct = sorted[0];

    return {
        horizon,
        sampleSize: returns.length,
        medianReturnPct,
        positiveOutcomePct,
        drawdownFrequencyPct,
        dispersionIQR,
        returnPct25,
        returnPct75,
        worstReturnPct,
    };
}

function percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    if (sortedArr.length === 1) return sortedArr[0];

    const index = (p / 100) * (sortedArr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

// ============================================================================
// Export store access for testing/debugging
// ============================================================================

export function getStoreStats() {
    return store.getStats();
}

export { store };
