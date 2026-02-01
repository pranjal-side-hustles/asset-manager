/**
 * SCORE BANDS - Normalized Score Interpretation
 * 
 * Phase 2 Lockdown: Ensure scores behave intuitively.
 * 
 * Score Range | Meaning
 * 75-100      | Exceptional
 * 60-74       | Strong
 * 45-59       | Neutral
 * <45         | Weak
 */

// ============================================================================
// Score Band Definitions
// ============================================================================

export const SCORE_BANDS = {
    EXCEPTIONAL: { min: 75, max: 100, label: "Exceptional", color: "#22c55e" },
    STRONG: { min: 60, max: 74, label: "Strong", color: "#84cc16" },
    NEUTRAL: { min: 45, max: 59, label: "Neutral", color: "#eab308" },
    WEAK: { min: 0, max: 44, label: "Weak", color: "#ef4444" },
} as const;

export type ScoreBandName = keyof typeof SCORE_BANDS;

export interface ScoreBand {
    name: ScoreBandName;
    label: string;
    min: number;
    max: number;
    color: string;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the score band for a given score
 */
export function getScoreBand(score: number): ScoreBand {
    // Clamp score to 0-100
    const clampedScore = Math.max(0, Math.min(100, score));

    if (clampedScore >= SCORE_BANDS.EXCEPTIONAL.min) {
        return {
            name: "EXCEPTIONAL",
            ...SCORE_BANDS.EXCEPTIONAL,
        };
    }

    if (clampedScore >= SCORE_BANDS.STRONG.min) {
        return {
            name: "STRONG",
            ...SCORE_BANDS.STRONG,
        };
    }

    if (clampedScore >= SCORE_BANDS.NEUTRAL.min) {
        return {
            name: "NEUTRAL",
            ...SCORE_BANDS.NEUTRAL,
        };
    }

    return {
        name: "WEAK",
        ...SCORE_BANDS.WEAK,
    };
}

/**
 * Get a plain-English description of the score
 */
export function getScoreDescription(score: number, context: "long-term" | "timing"): string {
    const band = getScoreBand(score);

    if (context === "long-term") {
        switch (band.name) {
            case "EXCEPTIONAL":
                return "Outstanding long-term quality";
            case "STRONG":
                return "Solid long-term fundamentals";
            case "NEUTRAL":
                return "Average long-term outlook";
            case "WEAK":
                return "Below-average long-term profile";
        }
    } else {
        switch (band.name) {
            case "EXCEPTIONAL":
                return "Excellent timing conditions";
            case "STRONG":
                return "Favorable timing conditions";
            case "NEUTRAL":
                return "Neutral timing conditions";
            case "WEAK":
                return "Unfavorable timing conditions";
        }
    }
}

/**
 * Check if score distribution needs rescaling
 * (If >80% of scores cluster between 40-60, consider gentle rescaling)
 */
export function checkScoreDistribution(scores: number[]): {
    needsRescaling: boolean;
    clusterPct: number;
    suggestion: string;
} {
    if (scores.length < 10) {
        return {
            needsRescaling: false,
            clusterPct: 0,
            suggestion: "Not enough data to evaluate distribution",
        };
    }

    const clusterMin = 40;
    const clusterMax = 60;
    const inCluster = scores.filter(s => s >= clusterMin && s <= clusterMax).length;
    const clusterPct = (inCluster / scores.length) * 100;

    if (clusterPct > 80) {
        return {
            needsRescaling: true,
            clusterPct,
            suggestion: `${clusterPct.toFixed(0)}% of scores cluster between ${clusterMin}-${clusterMax}. Consider gentle rescaling.`,
        };
    }

    return {
        needsRescaling: false,
        clusterPct,
        suggestion: "Score distribution is healthy",
    };
}

/**
 * Round score for display (no decimals, cleaner)
 */
export function roundScore(score: number): number {
    return Math.round(Math.max(0, Math.min(100, score)));
}
