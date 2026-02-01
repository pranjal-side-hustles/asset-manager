/**
 * Phase 3: Confirmation Engine
 * 
 * RULES:
 * - Does NOT modify Phase 0, 1, or 2 logic
 * - Only CONFIRMS or REJECTS Phase 2 decisions
 * - No price, indicator, or portfolio logic changes
 * - Cannot force BUY decisions or override risk blocks
 * 
 * 5 CONFIRMATION SIGNALS:
 * 1. Trend confirmation (price vs MA50/MA200)
 * 2. Volume confirmation (current vs avg)
 * 3. Volatility confirmation (ATR% trend)
 * 4. Market + sector alignment
 * 5. Event safety (earnings distance)
 */

import type {
    Phase3Input,
    Phase3Signal,
    Phase3ConfirmationResult,
    ConfirmationLevel,
    Phase3Thresholds,
} from "@shared/types/phase3";

import {
    DEFAULT_PHASE3_THRESHOLDS,
    PHASE3_POINT_VALUES,
    PHASE3_LEVEL_THRESHOLDS,
} from "@shared/types/phase3";

// ============================================================================
// Signal 1: Trend Confirmation
// Price should be above both MA50 and MA200 for bullish confirmation
// ============================================================================

function evaluateTrendSignal(
    input: Phase3Input,
    thresholds: Phase3Thresholds
): Phase3Signal {
    const { currentPrice, ma50, ma200, trendMaBuffer } = { ...input, trendMaBuffer: thresholds.trendMaBuffer };

    // Add buffer for noise tolerance
    const ma50Threshold = ma50 * (1 - trendMaBuffer);
    const ma200Threshold = ma200 * (1 - trendMaBuffer);

    const aboveMa50 = currentPrice > ma50Threshold;
    const aboveMa200 = currentPrice > ma200Threshold;
    const passed = aboveMa50 && aboveMa200;

    let reason: string;
    if (passed) {
        reason = `Price ($${currentPrice.toFixed(2)}) above both MA50 ($${ma50.toFixed(2)}) and MA200 ($${ma200.toFixed(2)})`;
    } else if (!aboveMa50 && !aboveMa200) {
        reason = `Price below both moving averages - bearish structure`;
    } else if (!aboveMa50) {
        reason = `Price below MA50 ($${ma50.toFixed(2)}) - short-term weakness`;
    } else {
        reason = `Price below MA200 ($${ma200.toFixed(2)}) - long-term downtrend`;
    }

    return {
        name: "TREND",
        label: "Trend Confirmation",
        passed,
        points: passed ? PHASE3_POINT_VALUES.TREND : 0,
        maxPoints: PHASE3_POINT_VALUES.TREND,
        reason,
    };
}

// ============================================================================
// Signal 2: Volume Confirmation
// Current volume should be at or above average for conviction
// ============================================================================

function evaluateVolumeSignal(
    input: Phase3Input,
    thresholds: Phase3Thresholds
): Phase3Signal {
    const { currentVolume, avgVolume } = input;
    const { volumeMinMultiple, volumeStrongMultiple } = thresholds;

    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
    const passed = volumeRatio >= volumeMinMultiple;
    const strong = volumeRatio >= volumeStrongMultiple;

    let reason: string;
    if (strong) {
        reason = `Strong volume confirmation (${volumeRatio.toFixed(1)}x average)`;
    } else if (passed) {
        reason = `Adequate volume (${volumeRatio.toFixed(1)}x average)`;
    } else {
        reason = `Week volume (${volumeRatio.toFixed(1)}x average) - low conviction`;
    }

    return {
        name: "VOLUME",
        label: "Volume Confirmation",
        passed,
        points: passed ? PHASE3_POINT_VALUES.VOLUME : 0,
        maxPoints: PHASE3_POINT_VALUES.VOLUME,
        reason,
    };
}

// ============================================================================
// Signal 3: Volatility Confirmation
// ATR% should be manageable and not expanding rapidly
// ============================================================================

function evaluateVolatilitySignal(
    input: Phase3Input,
    thresholds: Phase3Thresholds
): Phase3Signal {
    const { atrPercent, atrPercentPrev } = input;
    const { maxAtrPercent, atrTrendThreshold } = thresholds;

    const atrManageable = atrPercent <= maxAtrPercent;
    const atrStable = atrPercent <= atrPercentPrev + atrTrendThreshold;
    const passed = atrManageable && atrStable;

    let reason: string;
    if (passed) {
        if (atrPercent < atrPercentPrev) {
            reason = `Volatility contracting (ATR: ${atrPercent.toFixed(1)}% ↓ from ${atrPercentPrev.toFixed(1)}%)`;
        } else {
            reason = `Volatility stable (ATR: ${atrPercent.toFixed(1)}%)`;
        }
    } else if (!atrManageable) {
        reason = `High volatility (ATR: ${atrPercent.toFixed(1)}%) exceeds ${maxAtrPercent}% threshold`;
    } else {
        reason = `Volatility expanding (ATR: ${atrPercentPrev.toFixed(1)}% → ${atrPercent.toFixed(1)}%)`;
    }

    return {
        name: "VOLATILITY",
        label: "Volatility Confirmation",
        passed,
        points: passed ? PHASE3_POINT_VALUES.VOLATILITY : 0,
        maxPoints: PHASE3_POINT_VALUES.VOLATILITY,
        reason,
    };
}

// ============================================================================
// Signal 4: Market + Sector Alignment
// Market and sector regimes should be favorable
// ============================================================================

function evaluateAlignmentSignal(input: Phase3Input): Phase3Signal {
    const { marketRegime, sectorRegime } = input;

    const marketFavorable = marketRegime === "RISK_ON" || marketRegime === "NEUTRAL";
    const sectorFavorable = sectorRegime === "FAVORABLE" || sectorRegime === "NEUTRAL";
    const passed = marketFavorable && sectorFavorable;

    let reason: string;
    if (passed) {
        if (marketRegime === "RISK_ON" && sectorRegime === "FAVORABLE") {
            reason = `Strong alignment: Market (${marketRegime}) + Sector (${sectorRegime})`;
        } else {
            reason = `Acceptable alignment: Market (${marketRegime}) + Sector (${sectorRegime})`;
        }
    } else if (!marketFavorable && !sectorFavorable) {
        reason = `Poor alignment: Market (${marketRegime}) + Sector (${sectorRegime}) both unfavorable`;
    } else if (!marketFavorable) {
        reason = `Market regime (${marketRegime}) unfavorable`;
    } else {
        reason = `Sector regime (${sectorRegime}) unfavorable`;
    }

    return {
        name: "ALIGNMENT",
        label: "Market & Sector Alignment",
        passed,
        points: passed ? PHASE3_POINT_VALUES.ALIGNMENT : 0,
        maxPoints: PHASE3_POINT_VALUES.ALIGNMENT,
        reason,
    };
}

// ============================================================================
// Signal 5: Event Safety
// Sufficient distance from earnings to avoid binary event risk
// ============================================================================

function evaluateEventSafetySignal(
    input: Phase3Input,
    thresholds: Phase3Thresholds
): Phase3Signal {
    const { daysToEarnings } = input;
    const { minDaysToEarnings, safeDaysToEarnings } = thresholds;

    // If earnings date unknown, assume safe (no blocker)
    if (daysToEarnings === undefined || daysToEarnings === null) {
        return {
            name: "EVENT_SAFETY",
            label: "Event Safety",
            passed: true,
            points: PHASE3_POINT_VALUES.EVENT_SAFETY,
            maxPoints: PHASE3_POINT_VALUES.EVENT_SAFETY,
            reason: "No imminent earnings date detected",
        };
    }

    const passed = daysToEarnings >= minDaysToEarnings;
    const safe = daysToEarnings >= safeDaysToEarnings;

    let reason: string;
    if (safe) {
        reason = `Earnings in ${daysToEarnings} days - safe distance`;
    } else if (passed) {
        reason = `Earnings in ${daysToEarnings} days - proceed with caution`;
    } else {
        reason = `Earnings in ${daysToEarnings} days - too close, event risk`;
    }

    return {
        name: "EVENT_SAFETY",
        label: "Event Safety",
        passed,
        points: passed ? PHASE3_POINT_VALUES.EVENT_SAFETY : 0,
        maxPoints: PHASE3_POINT_VALUES.EVENT_SAFETY,
        reason,
    };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

function determineConfirmationLevel(score: number): ConfirmationLevel {
    if (score >= PHASE3_LEVEL_THRESHOLDS.STRONG) {
        return "STRONG";
    }
    if (score >= PHASE3_LEVEL_THRESHOLDS.WEAK) {
        return "WEAK";
    }
    return "NONE";
}

export function evaluatePhase3Confirmation(
    input: Phase3Input,
    thresholds: Phase3Thresholds = DEFAULT_PHASE3_THRESHOLDS
): Phase3ConfirmationResult {
    // Evaluate all 5 signals
    const signals: Phase3Signal[] = [
        evaluateTrendSignal(input, thresholds),
        evaluateVolumeSignal(input, thresholds),
        evaluateVolatilitySignal(input, thresholds),
        evaluateAlignmentSignal(input),
        evaluateEventSafetySignal(input, thresholds),
    ];

    // Separate into confirmations and blockers
    const confirmations = signals.filter(s => s.passed);
    const blockers = signals.filter(s => !s.passed);

    // Calculate total score
    const confirmationScore = signals.reduce((sum, s) => sum + s.points, 0);
    const maxPossibleScore = signals.reduce((sum, s) => sum + s.maxPoints, 0);
    const scorePercentage = maxPossibleScore > 0 ? (confirmationScore / maxPossibleScore) * 100 : 0;

    // Determine confirmation level
    const confirmationLevel = determineConfirmationLevel(confirmationScore);

    return {
        confirmationScore,
        confirmationLevel,
        confirmations,
        blockers,
        maxPossibleScore,
        scorePercentage,
        allSignals: signals,
        evaluatedAt: Date.now(),
    };
}

// ============================================================================
// Export
// ============================================================================

export type { Phase3Input, Phase3Signal, Phase3ConfirmationResult, ConfirmationLevel };
