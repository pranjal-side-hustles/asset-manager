import { logger } from "../infra/logging/logger";

export type DataMode = "LIVE" | "DEMO";

/**
 * Checks for the presence of required API keys to determine the operational mode.
 * LIVE: Marketstack (price provider) is configured. Finnhub is optional for sentiment/options.
 * DEMO: Marketstack is not configured.
 */
export function getDataMode(): DataMode {
    const marketstackKey = process.env.MARKETSTACK_API_KEY;

    // STRICT: LIVE mode requires Marketstack (the authoritative price source)
    if (marketstackKey) {
        return "LIVE";
    }

    return "DEMO";
}

/**
 * Helper to check if the app is currently in Demo Mode.
 */
export function isDemoMode(): boolean {
    return getDataMode() === "DEMO";
}

/**
 * Log the current data mode on startup.
 */
export function logDataMode(): void {
    const mode = getDataMode();
    const marketstackKey = process.env.MARKETSTACK_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;

    // Mask keys for logging
    const mask = (key?: string) => key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "MISSING";

    if (mode === "LIVE") {
        logger.info("DATA_FETCH", `Application running in LIVE mode (Marketstack: ${mask(marketstackKey)} [REQUIRED], Finnhub: ${mask(finnhubKey)} [optional for sentiment/options])`);
    } else {
        logger.warn("DATA_FETCH", "Application running in DEMO mode - Marketstack API key not configured.");
    }
}
