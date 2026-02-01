/**
 * Breadth Layer Evaluator
 * 
 * Evaluates market breadth as a confirmation signal for stock recommendations.
 * Uses advance/decline ratio, % above 200 DMA, and market health.
 */

import type {
    ConfirmationLayerResult,
    BreadthConfirmationData,
} from "@shared/types/confirmation";

export interface BreadthLayerInput {
    breadth: BreadthConfirmationData;
}

export function evaluateBreadthLayer(
    input: BreadthLayerInput
): ConfirmationLayerResult {
    const { breadth } = input;

    let signal: "CONFIRMING" | "NEUTRAL" | "DISCONFIRMING" = "NEUTRAL";
    let scoreAdjustment = 0;
    const reasons: string[] = [];
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

    // Strong breadth confirmation
    if (breadth.health === "STRONG") {
        if (breadth.advanceDeclineRatio >= 1.3) {
            signal = "CONFIRMING";
            scoreAdjustment = 3;
            reasons.push(`Strong market breadth (A/D: ${breadth.advanceDeclineRatio.toFixed(2)})`);
            confidence = "HIGH";
        } else {
            signal = "CONFIRMING";
            scoreAdjustment = 2;
            reasons.push("Market breadth healthy");
            confidence = "MEDIUM";
        }
    }
    // Weak breadth warning
    else if (breadth.health === "WEAK") {
        if (breadth.advanceDeclineRatio < 0.7) {
            signal = "DISCONFIRMING";
            scoreAdjustment = -3;
            reasons.push(`Weak market breadth (A/D: ${breadth.advanceDeclineRatio.toFixed(2)})`);
            confidence = "HIGH";
        } else {
            signal = "DISCONFIRMING";
            scoreAdjustment = -2;
            reasons.push("Market breadth deteriorating");
            confidence = "MEDIUM";
        }
    }
    // Neutral breadth
    else {
        signal = "NEUTRAL";
        scoreAdjustment = 0;
        reasons.push("Market breadth neutral");
        confidence = "MEDIUM";
    }

    // Additional signals from % above 200 DMA
    if (breadth.pctAbove200DMA >= 65) {
        reasons.push(`${breadth.pctAbove200DMA.toFixed(0)}% of stocks above 200 DMA (bullish)`);
        if (scoreAdjustment === 0) {
            scoreAdjustment = 1;
            signal = "CONFIRMING";
        }
    } else if (breadth.pctAbove200DMA <= 35) {
        reasons.push(`Only ${breadth.pctAbove200DMA.toFixed(0)}% of stocks above 200 DMA (bearish)`);
        if (scoreAdjustment === 0) {
            scoreAdjustment = -1;
            signal = "DISCONFIRMING";
        }
    }

    // New highs vs new lows
    if (breadth.newHighsLowsRatio >= 1.5) {
        reasons.push("New highs outpacing new lows");
    } else if (breadth.newHighsLowsRatio <= 0.5) {
        reasons.push("New lows outpacing new highs");
    }

    return {
        layer: "BREADTH",
        signal,
        confidence,
        scoreAdjustment,
        reasons,
        dataAvailable: true,
    };
}
