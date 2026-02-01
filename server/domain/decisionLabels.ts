/**
 * DECISION LABELS - Sanity Rules
 * 
 * Phase 2 Lockdown: Clear rules for decision labels.
 * 
 * Hard Rules:
 * 1. "Good to Act Now" requires: Timing ≥ 65, No risk blocks
 * 2. "Keep an Eye On" is default, not failure
 * 3. "Pause" must always explain why
 */

// ============================================================================
// Decision Label Types
// ============================================================================

export type DecisionLabel =
    | "GOOD_TO_ACT"
    | "KEEP_AN_EYE_ON"
    | "PAUSE";

export interface DecisionResult {
    label: DecisionLabel;
    displayText: string;
    explanation: string;
    canAct: boolean;
    riskBlockReasons: string[];
}

// ============================================================================
// Thresholds (LOCKED)
// ============================================================================

const TIMING_THRESHOLD_FOR_ACTION = 65;

// ============================================================================
// Core Function
// ============================================================================

/**
 * Get the decision label based on timing score and risk blocks
 * 
 * Rules:
 * 1. "Good to Act Now" requires: Timing ≥ 65, No risk blocks
 * 2. "Keep an Eye On" is default, not failure
 * 3. "Pause" must always explain why
 */
export function getDecisionLabel(
    timingScore: number,
    hasRiskBlocks: boolean,
    riskBlockReasons: string[] = [],
    marketRegime?: string,
    confirmationLevel?: string
): DecisionResult {
    // Rule 3: If there are risk blocks, we must pause and explain why
    if (hasRiskBlocks && riskBlockReasons.length > 0) {
        return {
            label: "PAUSE",
            displayText: "Pause",
            explanation: `Risk concerns: ${riskBlockReasons.join("; ")}`,
            canAct: false,
            riskBlockReasons,
        };
    }

    // Check market regime block
    if (marketRegime === "RISK_OFF") {
        return {
            label: "PAUSE",
            displayText: "Pause",
            explanation: "Market conditions are unfavorable (Risk-Off regime)",
            canAct: false,
            riskBlockReasons: ["Market regime is Risk-Off"],
        };
    }

    // Rule 1: "Good to Act Now" requires: Timing ≥ 65, No risk blocks
    if (timingScore >= TIMING_THRESHOLD_FOR_ACTION && !hasRiskBlocks) {
        return {
            label: "GOOD_TO_ACT",
            displayText: "Good to Act Now",
            explanation: "Timing conditions are favorable with no blocking concerns",
            canAct: true,
            riskBlockReasons: [],
        };
    }

    // Rule 2: "Keep an Eye On" is the default - NOT a failure
    return {
        label: "KEEP_AN_EYE_ON",
        displayText: "Keep an Eye On",
        explanation: getKeepAnEyeOnReason(timingScore, confirmationLevel),
        canAct: false, // Can watch, but not actionable yet
        riskBlockReasons: [],
    };
}

/**
 * Generate a helpful reason for "Keep an Eye On" status
 */
function getKeepAnEyeOnReason(
    timingScore: number,
    confirmationLevel?: string
): string {
    const reasons: string[] = [];

    if (timingScore < TIMING_THRESHOLD_FOR_ACTION) {
        reasons.push(`Timing score (${Math.round(timingScore)}) below action threshold (${TIMING_THRESHOLD_FOR_ACTION})`);
    }

    if (confirmationLevel === "NONE") {
        reasons.push("No confirmation from additional signals");
    } else if (confirmationLevel === "WEAK") {
        reasons.push("Only weak confirmation from additional signals");
    }

    if (reasons.length === 0) {
        reasons.push("Conditions are not yet optimal for action");
    }

    return reasons.join(". ");
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get the color for a decision label
 */
export function getDecisionLabelColor(label: DecisionLabel): string {
    switch (label) {
        case "GOOD_TO_ACT":
            return "#22c55e"; // Green
        case "KEEP_AN_EYE_ON":
            return "#eab308"; // Yellow
        case "PAUSE":
            return "#ef4444"; // Red
    }
}

/**
 * Get an icon name for a decision label
 */
export function getDecisionLabelIcon(label: DecisionLabel): string {
    switch (label) {
        case "GOOD_TO_ACT":
            return "check-circle";
        case "KEEP_AN_EYE_ON":
            return "eye";
        case "PAUSE":
            return "pause-circle";
    }
}
