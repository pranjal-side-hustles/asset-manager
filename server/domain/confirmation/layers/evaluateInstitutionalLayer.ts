/**
 * Institutional Layer Evaluator
 * 
 * Evaluates institutional activity (13F filings, ownership trends)
 * as a confirmation signal for stock recommendations.
 */

import type {
    ConfirmationLayerResult,
    InstitutionalConfirmationData,
    ConfirmationFlag,
} from "@shared/types/confirmation";

export interface InstitutionalLayerInput {
    institutional: InstitutionalConfirmationData;
}

export function evaluateInstitutionalLayer(
    input: InstitutionalLayerInput
): { result: ConfirmationLayerResult; flags: ConfirmationFlag[] } {
    const { institutional } = input;

    let signal: "CONFIRMING" | "NEUTRAL" | "DISCONFIRMING" = "NEUTRAL";
    let scoreAdjustment = 0;
    const reasons: string[] = [];
    const flags: ConfirmationFlag[] = [];
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

    const ownership = institutional.institutionalOwnership ?? 0;

    // Evaluate institutional trend
    if (institutional.institutionalTrend === "INCREASING") {
        if (ownership >= 60) {
            signal = "CONFIRMING";
            scoreAdjustment = 5;
            reasons.push(`Institutions increasing positions (${ownership.toFixed(0)}% ownership)`);
            confidence = "HIGH";
            flags.push("INSIDER_BUYING");
        } else {
            signal = "CONFIRMING";
            scoreAdjustment = 3;
            reasons.push("Institutional accumulation detected");
            confidence = "MEDIUM";
        }
    } else if (institutional.institutionalTrend === "DECREASING") {
        signal = "DISCONFIRMING";
        if (ownership >= 60) {
            // Large holders selling is more concerning
            scoreAdjustment = -5;
            reasons.push(`Institutions reducing positions (${ownership.toFixed(0)}% ownership)`);
            confidence = "HIGH";
            flags.push("INSTITUTIONAL_EXIT");
        } else {
            scoreAdjustment = -3;
            reasons.push("Institutional selling detected");
            confidence = "MEDIUM";
        }
    } else {
        // FLAT trend
        signal = "NEUTRAL";
        scoreAdjustment = 0;
        if (ownership >= 70) {
            reasons.push(`High institutional ownership (${ownership.toFixed(0)}%) but flat activity`);
        } else if (ownership >= 50) {
            reasons.push(`Moderate institutional ownership (${ownership.toFixed(0)}%)`);
        } else {
            reasons.push(`Low institutional ownership (${ownership.toFixed(0)}%)`);
            confidence = "LOW";
        }
    }

    // Add top holders context if available
    if (institutional.topHolders.length > 0) {
        const holderSummary = institutional.topHolders.slice(0, 3).join(", ");
        reasons.push(`Top holders: ${holderSummary}`);
    }

    return {
        result: {
            layer: "INSTITUTIONAL",
            signal,
            confidence,
            scoreAdjustment,
            reasons,
            dataAvailable: true,
        },
        flags,
    };
}
