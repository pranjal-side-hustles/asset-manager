/**
 * CANONICAL PRICE CONTRACT - IMMUTABLE
 * 
 * Phase 0 Lockdown: "The system never lies, never guesses, and never contradicts itself."
 * 
 * RULES:
 * 1. UI can ONLY consume this object for price display
 * 2. Indicators may NEVER override it
 * 3. If missing → explicit "Data unavailable" (never guess)
 * 4. This prevents future regressions
 */

// ============================================================================
// Canonical Price Interface (LOCKED)
// ============================================================================

export interface CanonicalPrice {
    /** The canonical EOD price - never modified */
    readonly price: number;

    /** Date in YYYY-MM-DD format */
    readonly date: string;

    /** Source is always Marketstack - no mixing providers */
    readonly source: "MARKETSTACK";
}

// ============================================================================
// Price Availability Status
// ============================================================================

export type PriceStatus =
    | "AVAILABLE"
    | "UNAVAILABLE"
    | "STALE"        // Older than 1 trading day
    | "ESTIMATED";   // Should never be used, but tracks if it happens

// ============================================================================
// Canonical Price Result (What functions return)
// ============================================================================

export interface CanonicalPriceResult {
    /** The canonical price, or null if unavailable */
    readonly canonicalPrice: CanonicalPrice | null;

    /** Status of the price data */
    readonly status: PriceStatus;

    /** Human-readable message for UI */
    readonly message: string;

    /** Whether this can be used for decision-making */
    readonly usableForDecisions: boolean;
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createCanonicalPrice(
    price: number,
    date: string
): CanonicalPrice {
    // Enforce immutability
    return Object.freeze({
        price,
        date,
        source: "MARKETSTACK" as const,
    });
}

export function createUnavailableResult(reason: string): CanonicalPriceResult {
    return Object.freeze({
        canonicalPrice: null,
        status: "UNAVAILABLE" as const,
        message: `Price unavailable: ${reason}`,
        usableForDecisions: false,
    });
}

export function createAvailableResult(
    price: number,
    date: string
): CanonicalPriceResult {
    return Object.freeze({
        canonicalPrice: createCanonicalPrice(price, date),
        status: "AVAILABLE" as const,
        message: `Price as of ${date}`,
        usableForDecisions: true,
    });
}

export function createStaleResult(
    price: number,
    date: string,
    daysBehind: number
): CanonicalPriceResult {
    return Object.freeze({
        canonicalPrice: createCanonicalPrice(price, date),
        status: "STALE" as const,
        message: `Price from ${date} (${daysBehind} trading days old)`,
        usableForDecisions: daysBehind <= 3, // Allow up to 3 days stale
    });
}
