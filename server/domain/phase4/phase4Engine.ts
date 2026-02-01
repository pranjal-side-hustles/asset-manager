/**
 * Phase 4: Strategy Playbooks Engine
 * 
 * RULES:
 * - Does NOT modify Phase 0-3 logic
 * - Playbooks only match conditions; they do not force actions
 * - Only one playbook may be active at a time
 * - If no playbook fits, return null
 * - Playbooks are user guidance, not signals
 */

import type {
    Phase4Input,
    Phase4Result,
    PlaybookName,
    PlaybookResult,
} from "@shared/types/phase4";

import { PLAYBOOK_DEFINITIONS } from "@shared/types/phase4";

// ============================================================================
// Eligibility Checker Type
// ============================================================================

interface EligibilityResult {
    eligible: boolean;
    matchScore: number;       // 0-100, how well it matches
    matchedRules: string[];
    nearMissRules: string[];
    disqualifyReason?: string;
}

// ============================================================================
// Playbook 1: Trend Continuation
// Strong uptrend with confirmation
// ============================================================================

function checkTrendContinuation(input: Phase4Input): EligibilityResult {
    const matchedRules: string[] = [];
    const nearMissRules: string[] = [];
    let score = 0;

    // Rule 1: Strategic and Tactical both BULLISH (required)
    if (input.strategicStatus === "BULLISH" && input.tacticalStatus === "BULLISH") {
        matchedRules.push("Both Strategic & Tactical BULLISH");
        score += 30;
    } else if (input.strategicStatus === "BULLISH" || input.tacticalStatus === "BULLISH") {
        nearMissRules.push("One horizon is BULLISH");
        score += 10;
    } else {
        return { eligible: false, matchScore: 0, matchedRules, nearMissRules, disqualifyReason: "Neither horizon is BULLISH" };
    }

    // Rule 2: Price above both MA50 and MA200 (required)
    if (input.priceVsMa50 > 0 && input.priceVsMa200 > 0) {
        matchedRules.push("Price above MA50 and MA200");
        score += 25;
    } else if (input.priceVsMa200 > 0) {
        nearMissRules.push("Price above MA200 but below MA50");
        score += 10;
    } else {
        return { eligible: false, matchScore: score, matchedRules, nearMissRules, disqualifyReason: "Price below key moving averages" };
    }

    // Rule 3: Confirmation at least WEAK (preferred)
    if (input.confirmationLevel === "STRONG") {
        matchedRules.push("STRONG confirmation");
        score += 25;
    } else if (input.confirmationLevel === "WEAK") {
        matchedRules.push("WEAK confirmation");
        score += 15;
    } else {
        nearMissRules.push("No confirmation from Phase 3");
        score += 5;
    }

    // Rule 4: Market regime supportive
    if (input.marketRegime === "RISK_ON") {
        matchedRules.push("RISK_ON market regime");
        score += 15;
    } else if (input.marketRegime === "NEUTRAL") {
        matchedRules.push("NEUTRAL market regime");
        score += 10;
    } else {
        nearMissRules.push("RISK_OFF market");
        score -= 10;
    }

    // Rule 5: Not too extended (bonus)
    if (input.priceVsMa50 < 10) {
        matchedRules.push("Not overextended from MA50");
        score += 5;
    } else {
        nearMissRules.push("Extended from MA50");
    }

    return { eligible: score >= 50, matchScore: Math.min(100, score), matchedRules, nearMissRules };
}

// ============================================================================
// Playbook 2: Pullback Entry
// Healthy pullback in an uptrend
// ============================================================================

function checkPullbackEntry(input: Phase4Input): EligibilityResult {
    const matchedRules: string[] = [];
    const nearMissRules: string[] = [];
    let score = 0;

    // Rule 1: Strategic BULLISH (long-term trend intact, required)
    if (input.strategicStatus === "BULLISH") {
        matchedRules.push("Strategic horizon BULLISH (trend intact)");
        score += 25;
    } else if (input.strategicStatus === "NEUTRAL") {
        nearMissRules.push("Strategic horizon NEUTRAL");
        score += 10;
    } else {
        return { eligible: false, matchScore: 0, matchedRules, nearMissRules, disqualifyReason: "Long-term trend not BULLISH" };
    }

    // Rule 2: Price above MA200 (trend intact, required)
    if (input.priceVsMa200 > 0) {
        matchedRules.push("Price above MA200 (uptrend intact)");
        score += 20;
    } else {
        return { eligible: false, matchScore: score, matchedRules, nearMissRules, disqualifyReason: "Price below MA200" };
    }

    // Rule 3: Price pulled back near or below MA50 (required for pullback)
    if (input.priceVsMa50 <= 2 && input.priceVsMa50 >= -5) {
        matchedRules.push("Price near MA50 support");
        score += 25;
    } else if (input.priceVsMa50 < 0 && input.priceVsMa50 >= -10) {
        matchedRules.push("Price below MA50 (deeper pullback)");
        score += 20;
    } else if (input.priceVsMa50 > 2) {
        return { eligible: false, matchScore: score, matchedRules, nearMissRules, disqualifyReason: "No pullback detected" };
    } else {
        nearMissRules.push("Pullback too deep");
        score += 5;
    }

    // Rule 4: RSI not extremely oversold (healthy pullback, not capitulation)
    if (input.rsi >= 30 && input.rsi <= 45) {
        matchedRules.push("RSI in healthy pullback zone (30-45)");
        score += 20;
    } else if (input.rsi >= 25 && input.rsi < 30) {
        matchedRules.push("RSI approaching oversold");
        score += 15;
    } else if (input.rsi > 45) {
        nearMissRules.push("RSI not yet in pullback zone");
        score += 5;
    } else {
        nearMissRules.push("RSI deeply oversold (possible capitulation)");
        score += 5;
    }

    // Rule 5: Weekly trend still UP
    if (input.weeklyTrend === "UP") {
        matchedRules.push("Weekly trend UP");
        score += 10;
    } else if (input.weeklyTrend === "SIDEWAYS") {
        nearMissRules.push("Weekly trend SIDEWAYS");
        score += 5;
    }

    return { eligible: score >= 55, matchScore: Math.min(100, score), matchedRules, nearMissRules };
}

// ============================================================================
// Playbook 3: Base Breakout (Watchlist)
// Consolidation/base formation
// ============================================================================

function checkBaseBreakout(input: Phase4Input): EligibilityResult {
    const matchedRules: string[] = [];
    const nearMissRules: string[] = [];
    let score = 0;

    // Rule 1: Price near MA50 (consolidating, required)
    if (Math.abs(input.priceVsMa50) <= 3) {
        matchedRules.push("Price consolidating near MA50");
        score += 25;
    } else if (Math.abs(input.priceVsMa50) <= 5) {
        nearMissRules.push("Price slightly extended from MA50");
        score += 15;
    } else {
        return { eligible: false, matchScore: 0, matchedRules, nearMissRules, disqualifyReason: "Not consolidating near key level" };
    }

    // Rule 2: Low volatility (base characteristics)
    if (input.atrPercent <= 3) {
        matchedRules.push("Low volatility (tight base)");
        score += 25;
    } else if (input.atrPercent <= 5) {
        matchedRules.push("Moderate volatility");
        score += 15;
    } else {
        nearMissRules.push("High volatility (not a base)");
        score += 5;
    }

    // Rule 3: Daily trend sideways (consolidating)
    if (input.dailyTrend === "SIDEWAYS") {
        matchedRules.push("Daily trend SIDEWAYS (consolidating)");
        score += 20;
    } else if (input.dailyTrend === "UP") {
        nearMissRules.push("Daily trend UP (may have broken out)");
        score += 10;
    } else {
        nearMissRules.push("Daily trend DOWN");
        score += 5;
    }

    // Rule 4: Strategic status at least NEUTRAL
    if (input.strategicStatus === "BULLISH") {
        matchedRules.push("Strategic BULLISH (quality base)");
        score += 15;
    } else if (input.strategicStatus === "NEUTRAL") {
        matchedRules.push("Strategic NEUTRAL");
        score += 10;
    } else {
        nearMissRules.push("Strategic BEARISH");
        score += 5;
    }

    // Rule 5: Near resistance (breakout potential)
    if (input.nearResistance) {
        matchedRules.push("Near resistance level");
        score += 15;
    } else {
        nearMissRules.push("No clear resistance nearby");
        score += 5;
    }

    return { eligible: score >= 50, matchScore: Math.min(100, score), matchedRules, nearMissRules };
}

// ============================================================================
// Playbook 4: Mean Reversion (Cautious)
// Oversold bounce candidate
// ============================================================================

function checkMeanReversion(input: Phase4Input): EligibilityResult {
    const matchedRules: string[] = [];
    const nearMissRules: string[] = [];
    let score = 0;

    // Rule 1: RSI deeply oversold (required)
    if (input.rsi <= 30) {
        matchedRules.push("RSI oversold (≤30)");
        score += 30;
    } else if (input.rsi <= 40) {
        nearMissRules.push("RSI approaching oversold");
        score += 10;
    } else {
        return { eligible: false, matchScore: 0, matchedRules, nearMissRules, disqualifyReason: "RSI not oversold" };
    }

    // Rule 2: Extended below MA50 (required)
    if (input.priceVsMa50 <= -5) {
        matchedRules.push("Extended below MA50");
        score += 25;
    } else if (input.priceVsMa50 < 0) {
        nearMissRules.push("Slightly below MA50");
        score += 10;
    } else {
        return { eligible: false, matchScore: score, matchedRules, nearMissRules, disqualifyReason: "Price not extended below MA50" };
    }

    // Rule 3: Tactical BEARISH or NEUTRAL (not already bouncing)
    if (input.tacticalStatus === "BEARISH") {
        matchedRules.push("Tactical BEARISH (oversold, not bouncing yet)");
        score += 20;
    } else if (input.tacticalStatus === "NEUTRAL") {
        matchedRules.push("Tactical NEUTRAL");
        score += 15;
    } else {
        nearMissRules.push("Tactical BULLISH (may have already bounced)");
        score += 5;
    }

    // Rule 4: Strategic not deeply BEARISH (some fundamental support)
    if (input.strategicStatus !== "BEARISH") {
        matchedRules.push("Strategic not BEARISH (fundamentals okay)");
        score += 15;
    } else {
        nearMissRules.push("Strategic BEARISH (fundamental concerns)");
        score += 5;
    }

    // Rule 5: Volatility elevated (creates snapback potential)
    if (input.atrPercent >= 3) {
        matchedRules.push("Elevated volatility (snapback potential)");
        score += 10;
    } else {
        nearMissRules.push("Low volatility");
        score += 5;
    }

    return { eligible: score >= 50, matchScore: Math.min(100, score), matchedRules, nearMissRules };
}

// ============================================================================
// Playbook 5: Defensive Hold
// Unfavorable conditions
// ============================================================================

function checkDefensiveHold(input: Phase4Input): EligibilityResult {
    const matchedRules: string[] = [];
    const nearMissRules: string[] = [];
    let score = 0;

    // Rule 1: Market regime RISK_OFF (strong signal)
    if (input.marketRegime === "RISK_OFF") {
        matchedRules.push("RISK_OFF market regime");
        score += 35;
    } else if (input.marketRegime === "NEUTRAL") {
        nearMissRules.push("NEUTRAL market regime");
        score += 10;
    }

    // Rule 2: Tactical BEARISH
    if (input.tacticalStatus === "BEARISH") {
        matchedRules.push("Tactical BEARISH");
        score += 25;
    } else if (input.tacticalStatus === "NEUTRAL") {
        nearMissRules.push("Tactical NEUTRAL");
        score += 10;
    }

    // Rule 3: No confirmation
    if (input.confirmationLevel === "NONE") {
        matchedRules.push("No confirmation from Phase 3");
        score += 20;
    } else if (input.confirmationLevel === "WEAK") {
        nearMissRules.push("WEAK confirmation");
        score += 10;
    }

    // Rule 4: Price below MA200 (bear market)
    if (input.priceVsMa200 < 0) {
        matchedRules.push("Price below MA200 (bear trend)");
        score += 15;
    } else if (input.priceVsMa200 < 5) {
        nearMissRules.push("Price near MA200");
        score += 5;
    }

    // Rule 5: Weekly trend DOWN
    if (input.weeklyTrend === "DOWN") {
        matchedRules.push("Weekly trend DOWN");
        score += 10;
    } else if (input.weeklyTrend === "SIDEWAYS") {
        nearMissRules.push("Weekly trend SIDEWAYS");
        score += 5;
    }

    // Need at least 2 strong signals to be defensive
    return { eligible: score >= 45, matchScore: Math.min(100, score), matchedRules, nearMissRules };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

export function evaluatePhase4Playbooks(input: Phase4Input): Phase4Result {
    const checkers: { name: PlaybookName; check: (input: Phase4Input) => EligibilityResult }[] = [
        { name: "TREND_CONTINUATION", check: checkTrendContinuation },
        { name: "PULLBACK_ENTRY", check: checkPullbackEntry },
        { name: "BASE_BREAKOUT", check: checkBaseBreakout },
        { name: "MEAN_REVERSION", check: checkMeanReversion },
        { name: "DEFENSIVE_HOLD", check: checkDefensiveHold },
    ];

    const consideredPlaybooks: Phase4Result["consideredPlaybooks"] = [];
    let bestMatch: { name: PlaybookName; result: EligibilityResult } | null = null;

    for (const { name, check } of checkers) {
        const result = check(input);

        consideredPlaybooks.push({
            name,
            eligible: result.eligible,
            matchScore: result.matchScore,
            reason: result.eligible
                ? `Matches ${result.matchedRules.length} rules (score: ${result.matchScore})`
                : result.disqualifyReason || "Insufficient match",
        });

        if (result.eligible) {
            if (!bestMatch || result.matchScore > bestMatch.result.matchScore) {
                bestMatch = { name, result };
            }
        }
    }

    // Build the active playbook result
    let activePlaybook: PlaybookResult | null = null;

    if (bestMatch) {
        const definition = PLAYBOOK_DEFINITIONS[bestMatch.name];
        activePlaybook = {
            name: bestMatch.name,
            title: definition.title,
            description: definition.description,
            guidance: definition.guidance,
            matchConfidence: bestMatch.result.matchScore,
            matchedRules: bestMatch.result.matchedRules,
            nearMissRules: bestMatch.result.nearMissRules.length > 0
                ? bestMatch.result.nearMissRules
                : undefined,
        };
    }

    return {
        activePlaybook,
        consideredPlaybooks,
        evaluatedAt: Date.now(),
    };
}
