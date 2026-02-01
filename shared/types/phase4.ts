/**
 * Phase 4: Strategy Playbooks Types
 * 
 * Playbooks are user guidance, NOT signals.
 * - Only one playbook may be active at a time
 * - If no playbook fits, return null
 * - Playbooks match conditions; they do not force actions
 */

// ============================================================================
// Playbook Names
// ============================================================================

export type PlaybookName =
    | "TREND_CONTINUATION"
    | "PULLBACK_ENTRY"
    | "BASE_BREAKOUT"
    | "MEAN_REVERSION"
    | "DEFENSIVE_HOLD";

// ============================================================================
// Playbook Definition
// ============================================================================

export interface PlaybookGuidance {
    /** Why this playbook fits the current situation */
    whyThisFits: string;

    /** How to use this playbook effectively */
    howToUse: string[];

    /** Risk notes and cautions */
    riskNotes: string[];
}

export interface PlaybookResult {
    /** Playbook identifier */
    name: PlaybookName;

    /** Human-readable title */
    title: string;

    /** Short description */
    description: string;

    /** Detailed guidance for the user */
    guidance: PlaybookGuidance;

    /** Confidence in the match (0-100) */
    matchConfidence: number;

    /** Which eligibility rules matched */
    matchedRules: string[];

    /** Which eligibility rules did NOT match (but were close) */
    nearMissRules?: string[];
}

// ============================================================================
// Phase 4 Result
// ============================================================================

export interface Phase4Result {
    /** The matched playbook, or null if none fits */
    activePlaybook: PlaybookResult | null;

    /** All playbooks that were considered */
    consideredPlaybooks: {
        name: PlaybookName;
        eligible: boolean;
        matchScore: number;
        reason: string;
    }[];

    /** Timestamp */
    evaluatedAt: number;
}

// ============================================================================
// Phase 4 Input (from existing phases)
// ============================================================================

export interface Phase4Input {
    // From Phase 2 scores
    strategicScore: number;      // 0-100
    tacticalScore: number;       // 0-100
    strategicStatus: string;     // BULLISH, NEUTRAL, BEARISH
    tacticalStatus: string;      // BULLISH, NEUTRAL, BEARISH

    // From Phase 3 confirmation
    confirmationLevel: "NONE" | "WEAK" | "STRONG";
    confirmationScore: number;

    // Technical context
    priceVsMa50: number;         // % above/below MA50
    priceVsMa200: number;        // % above/below MA200
    rsi: number;                 // 0-100
    weeklyTrend: "UP" | "DOWN" | "SIDEWAYS";
    dailyTrend: "UP" | "DOWN" | "SIDEWAYS";

    // Volatility
    atrPercent: number;

    // Market context
    marketRegime: string;        // RISK_ON, NEUTRAL, RISK_OFF

    // Recent price action
    recentPullbackPct?: number;  // % pullback from recent high
    daysInBase?: number;         // Days in consolidation
    nearResistance?: boolean;    // Near a key resistance level
}

// ============================================================================
// Playbook Metadata (static definitions)
// ============================================================================

export interface PlaybookDefinition {
    name: PlaybookName;
    title: string;
    description: string;
    guidance: PlaybookGuidance;
}

export const PLAYBOOK_DEFINITIONS: Record<PlaybookName, PlaybookDefinition> = {
    TREND_CONTINUATION: {
        name: "TREND_CONTINUATION",
        title: "Trend Continuation",
        description: "Ride the existing uptrend with momentum confirmation",
        guidance: {
            whyThisFits: "Strong uptrend with aligned fundamentals and technicals. Price is above key moving averages with positive momentum.",
            howToUse: [
                "Consider adding to positions on minor dips",
                "Trail stops using ATR or moving averages",
                "Watch for trend exhaustion signals (divergences)",
                "Size position based on conviction and volatility",
            ],
            riskNotes: [
                "Trends can reverse suddenly on macro events",
                "Avoid chasing if already extended from moving averages",
                "Reduce size during high volatility periods",
            ],
        },
    },

    PULLBACK_ENTRY: {
        name: "PULLBACK_ENTRY",
        title: "Pullback Entry",
        description: "Enter on a healthy pullback within an established uptrend",
        guidance: {
            whyThisFits: "Uptrend intact but price has pulled back to support. This offers a better risk/reward entry than chasing.",
            howToUse: [
                "Wait for stabilization at support (MA50, prior high)",
                "Look for reversal candles or RSI bounce from oversold",
                "Set stops below the pullback low",
                "Target the prior high or higher",
            ],
            riskNotes: [
                "Pullback may deepen into trend reversal",
                "Confirm with volume on the bounce",
                "Don't catch falling knives without stabilization",
            ],
        },
    },

    BASE_BREAKOUT: {
        name: "BASE_BREAKOUT",
        title: "Base Breakout (Watchlist)",
        description: "Stock is consolidating near highs - potential breakout setup",
        guidance: {
            whyThisFits: "Long consolidation after advance (building a base). Price is coiling with decreasing volatility, often preceding a major move.",
            howToUse: [
                "Add to watchlist and set price alerts",
                "Wait for breakout above resistance with volume",
                "Enter on breakout confirmation, not anticipation",
                "Measure the base height for target projection",
            ],
            riskNotes: [
                "Many bases fail - don't anticipate breakout",
                "False breakouts are common; use volume confirmation",
                "Be patient; bases can last weeks or months",
            ],
        },
    },

    MEAN_REVERSION: {
        name: "MEAN_REVERSION",
        title: "Mean Reversion (Cautious)",
        description: "Oversold bounce candidate - counter-trend opportunity",
        guidance: {
            whyThisFits: "Price is deeply oversold and extended below moving averages. Statistical probability favors a bounce, but trend is down.",
            howToUse: [
                "Size smaller than usual (counter-trend)",
                "Set tight stops below recent lows",
                "Target the declining moving average, not new highs",
                "Take profits quickly on any bounce",
            ],
            riskNotes: [
                "Counter-trend trades have lower win rates",
                "Don't average down on continued weakness",
                "Ensure fundamentals don't justify the decline",
                "This is a trade, not an investment thesis",
            ],
        },
    },

    DEFENSIVE_HOLD: {
        name: "DEFENSIVE_HOLD",
        title: "Defensive Hold",
        description: "Reduce risk exposure - unfavorable conditions",
        guidance: {
            whyThisFits: "Market conditions or stock technicals are unfavorable. Focus on capital preservation rather than gains.",
            howToUse: [
                "Avoid initiating new positions",
                "Tighten stops on existing positions",
                "Consider partial profit-taking",
                "Wait for conditions to improve",
            ],
            riskNotes: [
                "Missing rallies is a cost but smaller than drawdowns",
                "Don't force trades in unfavorable environments",
                "Cash is a position",
            ],
        },
    },
};
