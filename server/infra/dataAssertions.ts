/**
 * DATA INTEGRITY ASSERTIONS - Dev-Only
 * 
 * Phase 0 Lockdown: Fail fast in dev. Silent failures = future bugs.
 * 
 * These assertions run in development only to catch:
 * - Invalid prices (price <= 0)
 * - Missing moving averages before use
 * - RSI out of bounds
 * - Other data integrity issues
 */

// ============================================================================
// Configuration
// ============================================================================

const IS_DEV = process.env.NODE_ENV !== "production";
const THROW_ON_FAILURE = IS_DEV;

// ============================================================================
// Assertion Results
// ============================================================================

export interface AssertionResult {
    passed: boolean;
    message: string;
    field: string;
    value: unknown;
}

// ============================================================================
// Price Assertions
// ============================================================================

export function assertValidPrice(
    price: number | undefined | null,
    context: string = "price"
): AssertionResult {
    const result: AssertionResult = {
        passed: true,
        message: "",
        field: context,
        value: price,
    };

    if (price === undefined || price === null) {
        result.passed = false;
        result.message = `${context} is undefined or null`;
    } else if (typeof price !== "number") {
        result.passed = false;
        result.message = `${context} is not a number (got ${typeof price})`;
    } else if (isNaN(price)) {
        result.passed = false;
        result.message = `${context} is NaN`;
    } else if (price <= 0) {
        result.passed = false;
        result.message = `${context} must be > 0 (got ${price})`;
    } else if (!isFinite(price)) {
        result.passed = false;
        result.message = `${context} is not finite`;
    }

    if (!result.passed && THROW_ON_FAILURE) {
        console.error(`[DATA_ASSERTION] ${result.message}`);
        throw new Error(`Data assertion failed: ${result.message}`);
    }

    return result;
}

// ============================================================================
// Moving Average Assertions
// ============================================================================

export function assertValidMA(
    ma50: number | undefined | null,
    ma200: number | undefined | null,
    context: string = "moving averages"
): AssertionResult {
    const result: AssertionResult = {
        passed: true,
        message: "",
        field: context,
        value: { ma50, ma200 },
    };

    if (ma50 === undefined || ma50 === null) {
        result.passed = false;
        result.message = `MA50 must exist before being used`;
    } else if (ma200 === undefined || ma200 === null) {
        result.passed = false;
        result.message = `MA200 must exist before being used`;
    } else if (ma50 <= 0 || ma200 <= 0) {
        result.passed = false;
        result.message = `Moving averages must be > 0 (MA50: ${ma50}, MA200: ${ma200})`;
    }

    if (!result.passed && THROW_ON_FAILURE) {
        console.error(`[DATA_ASSERTION] ${result.message}`);
        throw new Error(`Data assertion failed: ${result.message}`);
    }

    return result;
}

// ============================================================================
// RSI Assertions
// ============================================================================

export function assertValidRSI(
    rsi: number | undefined | null,
    context: string = "RSI"
): AssertionResult {
    const result: AssertionResult = {
        passed: true,
        message: "",
        field: context,
        value: rsi,
    };

    if (rsi === undefined || rsi === null) {
        result.passed = false;
        result.message = `RSI is undefined or null`;
    } else if (typeof rsi !== "number") {
        result.passed = false;
        result.message = `RSI is not a number (got ${typeof rsi})`;
    } else if (rsi < 0 || rsi > 100) {
        result.passed = false;
        result.message = `RSI must be bounded 0-100 (got ${rsi})`;
    }

    if (!result.passed && THROW_ON_FAILURE) {
        console.error(`[DATA_ASSERTION] ${result.message}`);
        throw new Error(`Data assertion failed: ${result.message}`);
    }

    return result;
}

// ============================================================================
// Composite Assertions
// ============================================================================

export function assertValidTechnicals(technicals: {
    price?: number;
    ma50?: number;
    ma200?: number;
    rsi?: number;
}): AssertionResult[] {
    const results: AssertionResult[] = [];

    if (technicals.price !== undefined) {
        results.push(assertValidPrice(technicals.price, "current price"));
    }

    if (technicals.ma50 !== undefined || technicals.ma200 !== undefined) {
        results.push(assertValidMA(technicals.ma50, technicals.ma200));
    }

    if (technicals.rsi !== undefined) {
        results.push(assertValidRSI(technicals.rsi));
    }

    return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Run assertion only in development
 */
export function devAssert(condition: boolean, message: string): void {
    if (IS_DEV && !condition) {
        console.error(`[DEV_ASSERTION] ${message}`);
        throw new Error(`Dev assertion failed: ${message}`);
    }
}

/**
 * Log a data integrity warning (does not throw)
 */
export function logDataWarning(message: string, value: unknown): void {
    if (IS_DEV) {
        console.warn(`[DATA_WARNING] ${message}`, value);
    }
}
