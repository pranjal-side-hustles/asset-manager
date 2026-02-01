/**
 * UI LANGUAGE RULES
 * 
 * Phase 4 Lockdown: Playbook ≠ Recommendation
 * 
 * UI must never say:
 * - "You should buy"
 * - "Best strategy"
 * 
 * Always use:
 * - "Suggested approach given current conditions"
 * - "Historical tendency suggests"
 */

// ============================================================================
// Prohibited Phrases (LOCKED)
// ============================================================================

export const PROHIBITED_PHRASES = [
    "you should buy",
    "you should sell",
    "you must buy",
    "you must sell",
    "best strategy",
    "recommended action",
    "our recommendation",
    "we recommend",
    "guaranteed",
    "will make money",
    "risk-free",
    "can't lose",
    "sure thing",
    "slam dunk",
] as const;

// ============================================================================
// Approved Phrases (USE THESE)
// ============================================================================

export const APPROVED_PHRASES = {
    // For playbooks
    PLAYBOOK_INTRO: "Suggested approach given current conditions",
    PLAYBOOK_CONTEXT: "One way to interpret this situation",
    PLAYBOOK_CONSIDER: "Consider whether this approach fits your goals",

    // For signals
    SIGNAL_TENDENCY: "Historical tendency suggests",
    SIGNAL_INDICATION: "Conditions indicate",
    SIGNAL_OBSERVATION: "Current data shows",

    // For scores
    SCORE_DESCRIBES: "This score reflects",
    SCORE_BASED_ON: "Based on available data",

    // For actions
    ACTION_CONSIDER: "You may want to consider",
    ACTION_WATCH: "Worth monitoring",
    ACTION_WAIT: "Conditions suggest waiting",

    // Disclaimers
    DISCLAIMER_PAST: "Past performance does not guarantee future results",
    DISCLAIMER_PERSONAL: "This is not personalized investment advice",
    DISCLAIMER_RESEARCH: "Always do your own research",
} as const;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a text contains any prohibited phrases
 */
export function containsProhibitedPhrase(text: string): {
    hasProhibited: boolean;
    foundPhrases: string[];
} {
    const lowerText = text.toLowerCase();
    const foundPhrases: string[] = [];

    for (const phrase of PROHIBITED_PHRASES) {
        if (lowerText.includes(phrase)) {
            foundPhrases.push(phrase);
        }
    }

    return {
        hasProhibited: foundPhrases.length > 0,
        foundPhrases,
    };
}

/**
 * Sanitize text by replacing prohibited phrases with approved alternatives
 */
export function sanitizeUIText(text: string): string {
    let sanitized = text;

    // Replace common prohibited phrases
    const replacements: [RegExp, string][] = [
        [/you should buy/gi, "you may want to consider"],
        [/you should sell/gi, "you may want to consider exiting"],
        [/you must buy/gi, "conditions may favor"],
        [/you must sell/gi, "conditions may suggest caution"],
        [/best strategy/gi, "one approach to consider"],
        [/recommended action/gi, "suggested approach"],
        [/our recommendation/gi, "one interpretation"],
        [/we recommend/gi, "conditions suggest"],
        [/guaranteed/gi, "historically common"],
        [/will make money/gi, "has historically performed"],
        [/risk-free/gi, "lower risk"],
        [/can't lose/gi, "historically favorable"],
        [/sure thing/gi, "higher confidence setup"],
        [/slam dunk/gi, "favorable conditions"],
    ];

    for (const [pattern, replacement] of replacements) {
        sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
}

// ============================================================================
// Standard Disclaimers
// ============================================================================

export const STANDARD_DISCLAIMERS = [
    "This information is for educational purposes only.",
    "Past performance does not guarantee future results.",
    "This is not personalized investment advice.",
    "Always do your own research before making investment decisions.",
    "Consult a financial advisor for personalized guidance.",
];

/**
 * Get disclaimers that should be shown with any playbook
 */
export function getPlaybookDisclaimers(): string[] {
    return [
        APPROVED_PHRASES.PLAYBOOK_INTRO,
        STANDARD_DISCLAIMERS[0],
        STANDARD_DISCLAIMERS[1],
    ];
}

/**
 * Get disclaimers that should be shown with performance data
 */
export function getPerformanceDisclaimers(): string[] {
    return [
        STANDARD_DISCLAIMERS[1],
        STANDARD_DISCLAIMERS[2],
        "Historical tendencies are not predictions of future outcomes.",
        "Individual results may vary significantly from aggregates.",
    ];
}
