/**
 * Sentiment Layer Evaluator
 * 
 * Evaluates sentiment data (analyst ratings, insider activity, social sentiment)
 * as a confirmation signal for stock recommendations.
 */

import type {
    ConfirmationLayerResult,
    SentimentConfirmationData,
    ConfirmationFlag,
} from "@shared/types/confirmation";

export interface SentimentLayerInput {
    sentiment: SentimentConfirmationData;
}

export function evaluateSentimentLayer(
    input: SentimentLayerInput
): { result: ConfirmationLayerResult; flags: ConfirmationFlag[] } {
    const { sentiment } = input;

    let signal: "CONFIRMING" | "NEUTRAL" | "DISCONFIRMING" = "NEUTRAL";
    let scoreAdjustment = 0;
    const reasons: string[] = [];
    const flags: ConfirmationFlag[] = [];
    let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";

    let positiveSignals = 0;
    let negativeSignals = 0;

    // Analyst Rating (1-5 scale, 5 = Strong Buy)
    const rating = sentiment.analystRating;
    if (rating >= 4.0) {
        positiveSignals += 2;
        reasons.push(`Strong analyst rating: ${rating.toFixed(1)}/5`);
    } else if (rating >= 3.5) {
        positiveSignals += 1;
        reasons.push(`Positive analyst rating: ${rating.toFixed(1)}/5`);
    } else if (rating <= 2.5) {
        negativeSignals += 2;
        reasons.push(`Weak analyst rating: ${rating.toFixed(1)}/5`);
    } else if (rating < 3.0) {
        negativeSignals += 1;
        reasons.push(`Below-average analyst rating: ${rating.toFixed(1)}/5`);
    } else {
        reasons.push(`Neutral analyst rating: ${rating.toFixed(1)}/5`);
    }

    // Insider Activity
    if (sentiment.insiderBuying) {
        positiveSignals += 2;
        reasons.push("Recent insider buying detected");
        flags.push("INSIDER_BUYING");
    } else {
        // Check recommendation trend for selling signal
        const { buy, sell } = sentiment.recommendationTrend;
        if (sell > buy * 2) {
            negativeSignals += 1;
            reasons.push("Analysts skewing toward sell recommendations");
        }
    }

    // Price Target vs Current (if available)
    if (sentiment.analystPriceTarget) {
        reasons.push(`Analyst price target: $${sentiment.analystPriceTarget.toFixed(2)}`);
    }

    // Social Sentiment
    if (sentiment.socialSentiment === "BULLISH") {
        positiveSignals += 1;
        reasons.push("Bullish social sentiment");
    } else if (sentiment.socialSentiment === "BEARISH") {
        negativeSignals += 1;
        reasons.push("Bearish social sentiment");
    }

    // News Score
    if (sentiment.newsScore !== undefined) {
        if (sentiment.newsScore >= 0.3) {
            positiveSignals += 1;
            reasons.push("Positive recent news coverage");
        } else if (sentiment.newsScore <= -0.3) {
            negativeSignals += 1;
            reasons.push("Negative recent news coverage");
        }
    }

    // Recommendation Trend Summary
    const { buy, hold, sell } = sentiment.recommendationTrend;
    const total = buy + hold + sell;
    if (total > 0) {
        const buyPct = (buy / total) * 100;
        if (buyPct >= 70) {
            reasons.push(`${buyPct.toFixed(0)}% of analysts recommend Buy`);
        } else if (buyPct <= 30) {
            reasons.push(`Only ${buyPct.toFixed(0)}% of analysts recommend Buy`);
        }
    }

    // Determine overall signal
    const netSignal = positiveSignals - negativeSignals;

    if (netSignal >= 3) {
        signal = "CONFIRMING";
        scoreAdjustment = 3;
        confidence = "HIGH";
    } else if (netSignal >= 1) {
        signal = "CONFIRMING";
        scoreAdjustment = 2;
        confidence = "MEDIUM";
    } else if (netSignal <= -3) {
        signal = "DISCONFIRMING";
        scoreAdjustment = -3;
        confidence = "HIGH";
        flags.push("INSIDER_SELLING");
    } else if (netSignal <= -1) {
        signal = "DISCONFIRMING";
        scoreAdjustment = -2;
        confidence = "MEDIUM";
    } else {
        signal = "NEUTRAL";
        scoreAdjustment = 0;
        confidence = "MEDIUM";
    }

    return {
        result: {
            layer: "SENTIMENT",
            signal,
            confidence,
            scoreAdjustment,
            reasons,
            dataAvailable: true,
        },
        flags,
    };
}
