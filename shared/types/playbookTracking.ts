/**
 * Playbook Performance Tracking Types
 * 
 * RULES (Survivorship Bias Prevention):
 * - Track playbook INSTANCES, not trades
 * - Log every time a playbook is SHOWN
 * - NEVER condition on user actions
 * - NEVER track entries/exits
 * 
 * Outcomes computed at fixed horizons using EOD prices only.
 */

import type { PlaybookName } from "./phase4";
import type { ConfirmationLevel } from "./phase3";

// ============================================================================
// Playbook Instance (What we track)
// ============================================================================

export interface PlaybookInstance {
    /** Unique instance ID */
    id: string;

    /** Symbol for which playbook was shown */
    symbol: string;

    /** Which playbook was shown */
    playbookId: PlaybookName;

    /** When the playbook was shown (timestamp) */
    timestamp: number;

    /** Date in YYYY-MM-DD format */
    date: string;

    /** EOD price when playbook was shown */
    priceAtSignal: number;

    /** Market regime at time of signal */
    marketRegime: string;

    /** Sector regime at time of signal */
    sectorRegime: string;

    /** Phase 3 confirmation level */
    confirmationLevel: ConfirmationLevel;

    /** Match confidence from Phase 4 (0-100) */
    matchConfidence: number;
}

// ============================================================================
// Outcome Horizons (Fixed, in trading days)
// ============================================================================

export const OUTCOME_HORIZONS = [5, 20, 60] as const;
export type OutcomeHorizon = typeof OUTCOME_HORIZONS[number];

// ============================================================================
// Outcome Status
// ============================================================================

export type OutcomeStatus =
    | "PENDING"           // Not enough time has passed
    | "COMPUTED"          // Outcome calculated
    | "INSUFFICIENT_DATA"; // Missing EOD data

// ============================================================================
// Single Horizon Outcome
// ============================================================================

export interface HorizonOutcome {
    /** Horizon in trading days */
    horizon: OutcomeHorizon;

    /** Status of this outcome */
    status: OutcomeStatus;

    /** Return percentage (null if not computed) */
    returnPct: number | null;

    /** Price at horizon (null if not computed) */
    priceAtHorizon: number | null;

    /** Date at horizon (null if not computed) */
    dateAtHorizon: string | null;

    /** Maximum drawdown during the period (%) */
    maxDrawdownPct: number | null;
}

// ============================================================================
// Complete Outcome Record
// ============================================================================

export interface PlaybookOutcome {
    /** Instance ID this outcome belongs to */
    instanceId: string;

    /** Outcomes for each horizon */
    horizons: Record<OutcomeHorizon, HorizonOutcome>;

    /** When outcomes were last computed */
    computedAt: number;
}

// ============================================================================
// Aggregate Metrics (What we show)
// ============================================================================

export interface PlaybookAggregateMetrics {
    /** Playbook being analyzed */
    playbookId: PlaybookName;

    /** Total instances tracked */
    totalInstances: number;

    /** Instances with sufficient data for each horizon */
    instancesWithData: Record<OutcomeHorizon, number>;

    /** Metrics per horizon */
    horizonMetrics: Record<OutcomeHorizon, HorizonMetrics>;

    /** Date range of instances */
    dateRange: {
        earliest: string;
        latest: string;
    };

    /** When metrics were computed */
    computedAt: number;
}

export interface HorizonMetrics {
    /** Horizon in trading days */
    horizon: OutcomeHorizon;

    /** Number of instances with data */
    sampleSize: number;

    /** Median return (less sensitive to outliers than mean) */
    medianReturnPct: number | null;

    /** Percentage of positive outcomes */
    positiveOutcomePct: number | null;

    /** Frequency of drawdowns > 5% during period */
    drawdownFrequencyPct: number | null;

    /** Interquartile range (measure of dispersion) */
    dispersionIQR: number | null;

    /** 25th percentile return */
    returnPct25: number | null;

    /** 75th percentile return */
    returnPct75: number | null;

    /** Worst outcome (for context, not emphasis) */
    worstReturnPct: number | null;
}

// ============================================================================
// What we NEVER show (documented here for clarity)
// ============================================================================

/**
 * PROHIBITED METRICS (Survivorship Bias Risk):
 * 
 * - Equity curves (implies continuous tracking)
 * - Best trades (cherry-picking)
 * - Win-rate-only metrics (incomplete picture)
 * - Symbol-level performance (sample size issues)
 * - Mean return (skewed by outliers)
 * - Sharpe ratio (implies active trading)
 */

// ============================================================================
// Storage Interface
// ============================================================================

export interface PlaybookTrackingStore {
    /** Save a new playbook instance */
    saveInstance(instance: PlaybookInstance): Promise<void>;

    /** Get all instances for a playbook */
    getInstancesByPlaybook(playbookId: PlaybookName): Promise<PlaybookInstance[]>;

    /** Get instances that need outcome computation */
    getPendingOutcomes(): Promise<PlaybookInstance[]>;

    /** Save computed outcomes */
    saveOutcome(outcome: PlaybookOutcome): Promise<void>;

    /** Get outcome for an instance */
    getOutcome(instanceId: string): Promise<PlaybookOutcome | null>;

    /** Get all outcomes for a playbook */
    getOutcomesByPlaybook(playbookId: PlaybookName): Promise<PlaybookOutcome[]>;
}

// ============================================================================
// UI Display Types
// ============================================================================

export interface PlaybookPerformanceDisplay {
    /** Playbook info */
    playbookId: PlaybookName;
    playbookTitle: string;

    /** Aggregate metrics */
    metrics: PlaybookAggregateMetrics;

    /** Disclaimers (always shown) */
    disclaimers: string[];
}

export const PERFORMANCE_DISCLAIMERS = [
    "Historical tendencies, not predictions of future results.",
    "Returns are measured from playbook appearance, not user entry.",
    "Past performance does not guarantee future outcomes.",
    "Metrics are based on all instances, regardless of user action.",
    "Individual results may vary significantly from aggregates.",
];
