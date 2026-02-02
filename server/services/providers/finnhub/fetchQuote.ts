import { rateLimitedFetch } from "./rateLimiter";
import { logger } from "../../../infra";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export interface FinnhubQuote {
    c: number; // Current price
    d: number; // Change
    dp: number; // Percent change
    h: number; // High
    l: number; // Low
    o: number; // Open
    pc: number; // Previous close
    t: number; // Timestamp
}

/**
 * Fetch intraday quote from Finnhub.
 * Used ONLY as a secondary estimate for STOCK_DETAIL or primary for SEARCH.
 */
export async function fetchFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
    const apiKey = process.env.FINNHUB_API_KEY;
    const upperSymbol = symbol.toUpperCase();

    if (!apiKey) {
        return null;
    }

    try {
        const response = await rateLimitedFetch(`${FINNHUB_BASE_URL}/quote?symbol=${upperSymbol}&token=${apiKey}`);

        if (!response.ok) {
            logger.withContext({ symbol: upperSymbol }).warn("PROVIDER_FAILURE", `Finnhub quote failed: ${response.status}`);
            return null;
        }

        const data: FinnhubQuote = await response.json();

        // Finnhub returns 0 for all fields if symbol not found or no data
        if (data.c === 0 && data.t === 0) {
            return null;
        }

        return data;
    } catch (error) {
        logger.withContext({ symbol: upperSymbol }).error("PROVIDER_FAILURE", `Finnhub quote error: ${error}`);
        return null;
    }
}
