/**
 * Options Layer Evaluator
 * 
 * Evaluates options market data (put/call ratio, IV, open interest)
 * as a confirmation signal for stock recommendations.
 */

import type {
    ConfirmationLayerResult,
    OptionsConfirmationData,
    ConfirmationFlag,
} from "@shared/types/confirmation";

export interface OptionsLayerInput {
    options: OptionsConfirmationData;
}

export function evaluateOptionsLayer(
    input: OptionsLayerInput
): { result: ConfirmationLayerResult; flags: ConfirmationFlag[] } {
    const { options } = input;

    let signal: "CONFIRMING" | "NEUTRAL" | "DISCONFIRMING" = "NEUTRAL";
    let scoreAdjustment = 0;
    const reasons: string[] = [];
    const flags: ConfirmationFlag[] = [];
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

    const pcRatio = options.putCallRatio;
    const iv = options.impliedVolatility;
    const ivRank = options.ivRank;

    // Evaluate Put/Call Ratio
    // Low P/C = bullish options flow, High P/C = bearish/hedging
    if (pcRatio < 0.7) {
        signal = "CONFIRMING";
        scoreAdjustment = 4;
        reasons.push(`Bullish options flow (P/C: ${pcRatio.toFixed(2)})`);
        flags.push("LOW_PUT_CALL");
        confidence = "HIGH";
    } else if (pcRatio > 1.2) {
        signal = "DISCONFIRMING";
        scoreAdjustment = -4;
        reasons.push(`Bearish options flow (P/C: ${pcRatio.toFixed(2)})`);
        flags.push("HIGH_PUT_CALL");
        confidence = "HIGH";
    } else if (pcRatio >= 0.7 && pcRatio <= 1.1) {
        signal = "NEUTRAL";
        scoreAdjustment = 0;
        reasons.push(`Balanced options flow (P/C: ${pcRatio.toFixed(2)})`);
    } else {
        // Slightly elevated P/C (1.1-1.2)
        signal = "NEUTRAL";
        scoreAdjustment = -1;
        reasons.push(`Slightly elevated put activity (P/C: ${pcRatio.toFixed(2)})`);
    }

    // Evaluate Implied Volatility
    if (ivRank !== undefined) {
        if (ivRank >= 80) {
            reasons.push(`Elevated IV rank: ${ivRank}% (high uncertainty)`);
            flags.push("ELEVATED_IV");
            // Elevated IV can be a warning sign
            if (signal !== "DISCONFIRMING") {
                scoreAdjustment = Math.max(scoreAdjustment - 1, -5);
            }
        } else if (ivRank <= 20) {
            reasons.push(`Low IV rank: ${ivRank}% (complacency)`);
            // Very low IV can mean complacency - slightly negative
        } else {
            reasons.push(`Normal IV rank: ${ivRank}%`);
        }
    } else if (iv !== undefined) {
        // Fallback to raw IV if rank not available
        if (iv > 0.5) {
            reasons.push(`High implied volatility: ${(iv * 100).toFixed(0)}%`);
        } else if (iv < 0.2) {
            reasons.push(`Low implied volatility: ${(iv * 100).toFixed(0)}%`);
        }
    }

    // Open Interest context
    const totalOI = options.totalOpenInterest;
    if (totalOI > 0) {
        const callPct = (options.callOpenInterest / totalOI) * 100;
        if (callPct >= 65) {
            reasons.push(`Call-heavy open interest (${callPct.toFixed(0)}% calls)`);
        } else if (callPct <= 35) {
            reasons.push(`Put-heavy open interest (${(100 - callPct).toFixed(0)}% puts)`);
        }
    }

    // Unusual activity flag
    if (options.unusualActivity) {
        reasons.push("Unusual options activity detected");
        confidence = "HIGH";
    }

    return {
        result: {
            layer: "OPTIONS",
            signal,
            confidence,
            scoreAdjustment,
            reasons,
            dataAvailable: true,
        },
        flags,
    };
}
