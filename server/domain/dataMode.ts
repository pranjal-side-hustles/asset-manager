import { logger } from "../infra/logging/logger";

export type DataMode = "LIVE" | "DEMO";

/**
 * Checks for the presence of required API keys to determine the operational mode.
 * LIVE: At least one primary provider (Marketstack or Finnhub) is configured.
 * DEMO: No primary providers are configured.
 */
export function getDataMode(): DataMode {
    const marketstackKey = process.env.MARKETSTACK_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;

    if (marketstackKey || finnhubKey) {
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

    if (mode === "LIVE") {
        logger.info("DATA_FETCH", `Application running in LIVE mode (Marketstack: ${!!marketstackKey}, Finnhub: ${!!finnhubKey})`);
    } else {
        logger.warn("DATA_FETCH", "Application running in DEMO mode - No API keys configured. Using representative data.");
    }
}
