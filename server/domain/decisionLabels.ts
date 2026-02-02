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
    | "WORTH_A_SMALL_LOOK"
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
            displayText: "Pause for Now",
            explanation: `Wait due to risk: ${riskBlockReasons[0]}`,
            canAct: false,
            riskBlockReasons,
        };
    }

    // Check market regime block
    if (marketRegime === "RISK_OFF") {
        return {
            label: "PAUSE",
            displayText: "Pause for Now",
            explanation: "Market risk overrides FORCE signals",
            canAct: false,
            riskBlockReasons: ["Market regime is Risk-Off"],
        };
    }

    // Rule 1: "Good to Act Now" requires: Timing ≥ 65, No risk blocks
    if (timingScore >= TIMING_THRESHOLD_FOR_ACTION && !hasRiskBlocks) {
        return {
            label: "GOOD_TO_ACT",
            displayText: "Good to Act Now",
            explanation: "SHAPE is solid, FORCE is aligned",
            canAct: true,
            riskBlockReasons: [],
        };
    }

    // Rule: "Worth a Small Look" for intermediate scores
    if (timingScore >= 50 && !hasRiskBlocks) {
        return {
            label: "WORTH_A_SMALL_LOOK",
            displayText: "Worth a Small Look",
            explanation: "SHAPE is solid, FORCE still developing",
            canAct: true, // Limited action
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
    if (timingScore < 40) {
        return "FORCE is weak despite acceptable SHAPE";
    }

    if (confirmationLevel === "NONE") {
        return "SHAPE is constructive, FORCE needs confirmation";
    } else if (confirmationLevel === "WEAK") {
        return "SHAPE and FORCE are developing together";
    }

    return "SHAPE is solid, FORCE still developing";
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
            return "#10b981"; // Muted Green (Emerald 500)
        case "WORTH_A_SMALL_LOOK":
            return "#3b82f6"; // Muted Blue (Blue 500)
        case "KEEP_AN_EYE_ON":
            return "#64748b"; // Slate (Slate 500)
        case "PAUSE":
            return "#f59e0b"; // Muted Amber (Amber 500)
    }
}

/**
 * Get an icon name for a decision label
 */
export function getDecisionLabelIcon(label: DecisionLabel): string {
    switch (label) {
        case "GOOD_TO_ACT":
            return "check-circle";
        case "WORTH_A_SMALL_LOOK":
            return "trending-up";
        case "KEEP_AN_EYE_ON":
            return "eye";
        case "PAUSE":
            return "pause-circle";
    }
}
