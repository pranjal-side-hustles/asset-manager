/**
 * Events Layer Evaluator
 * 
 * Evaluates upcoming events (earnings, dividends, news)
 * as a confirmation signal for stock recommendations.
 */

import type {
    ConfirmationLayerResult,
    EventsConfirmationData,
    ConfirmationFlag,
} from "@shared/types/confirmation";

export interface EventsLayerInput {
    events: EventsConfirmationData;
}

export function evaluateEventsLayer(
    input: EventsLayerInput
): { result: ConfirmationLayerResult; flags: ConfirmationFlag[] } {
    const { events } = input;

    let signal: "CONFIRMING" | "NEUTRAL" | "DISCONFIRMING" = "NEUTRAL";
    let scoreAdjustment = 0;
    const reasons: string[] = [];
    const flags: ConfirmationFlag[] = [];
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

    let riskFactors = 0;
    let clearFactors = 0;

    // Earnings Proximity
    if (events.daysToEarnings !== undefined && events.daysToEarnings !== null) {
        if (events.daysToEarnings < 5) {
            riskFactors += 3;
            reasons.push(`⚠ Earnings in ${events.daysToEarnings} days`);
            flags.push("EARNINGS_IMMINENT");
            confidence = "HIGH";
        } else if (events.daysToEarnings <= 14) {
            riskFactors += 1;
            reasons.push(`Earnings coming in ${events.daysToEarnings} days`);
            flags.push("EARNINGS_SOON");
        } else {
            clearFactors += 1;
            reasons.push(`Earnings distant (${events.daysToEarnings} days)`);
        }
    } else {
        clearFactors += 1;
        reasons.push("No imminent earnings date");
    }

    // Dividend Ex-Date
    if (events.daysToExDividend !== undefined && events.daysToExDividend !== null) {
        if (events.daysToExDividend <= 7) {
            // Dividend capture can be a positive for long positions
            reasons.push(`Ex-dividend in ${events.daysToExDividend} days`);
            flags.push("DIVIDEND_UPCOMING");
        } else if (events.daysToExDividend <= 3) {
            // Very close to ex-div, could affect decision
            reasons.push(`⚠ Ex-dividend in ${events.daysToExDividend} days`);
            flags.push("DIVIDEND_UPCOMING");
        }
    }

    // News Activity
    if (events.hasUpcomingNews) {
        riskFactors += 2;
        reasons.push("Major news or event pending");
        flags.push("MAJOR_NEWS_PENDING");
        confidence = "HIGH";
    } else if (events.recentNewsCount >= 10) {
        // High news volume could indicate volatility
        riskFactors += 1;
        reasons.push(`High news activity (${events.recentNewsCount} items this week)`);
    } else if (events.recentNewsCount <= 2) {
        clearFactors += 1;
        reasons.push("Low news activity (quiet period)");
    }

    // Determine overall signal
    const netRisk = riskFactors - clearFactors;

    if (netRisk >= 3) {
        signal = "DISCONFIRMING";
        scoreAdjustment = -3;
        confidence = "HIGH";
    } else if (netRisk >= 1) {
        signal = "DISCONFIRMING";
        scoreAdjustment = -1;
        confidence = "MEDIUM";
    } else if (netRisk <= -2) {
        signal = "CONFIRMING";
        scoreAdjustment = 2;
        confidence = "MEDIUM";
    } else if (netRisk <= -1) {
        signal = "CONFIRMING";
        scoreAdjustment = 1;
        confidence = "LOW";
    } else {
        signal = "NEUTRAL";
        scoreAdjustment = 0;
        confidence = "MEDIUM";
    }

    // Add date context
    if (events.nextEarningsDate) {
        const earningsInfo = `Next earnings: ${events.nextEarningsDate}`;
        if (!reasons.some(r => r.includes("Earnings"))) {
            reasons.push(earningsInfo);
        }
    }

    return {
        result: {
            layer: "EVENTS",
            signal,
            confidence,
            scoreAdjustment,
            reasons,
            dataAvailable: true,
        },
        flags,
    };
}
