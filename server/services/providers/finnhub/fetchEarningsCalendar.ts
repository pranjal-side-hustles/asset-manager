import { rateLimitedFetch } from "./rateLimiter";
import { logger } from "../../../infra/logging/logger";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// Cache earnings data for 24 hours (calendar doesn't change often)
const earningsCache = new Map<string, { data: EarningsCalendarData; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FinnhubEarningsEntry {
    date: string;
    epsActual: number | null;
    epsEstimate: number | null;
    hour: string;
    quarter: number;
    revenueActual: number | null;
    revenueEstimate: number | null;
    symbol: string;
    year: number;
}

interface FinnhubEarningsResponse {
    earningsCalendar: FinnhubEarningsEntry[];
}

export interface EarningsCalendarData {
    symbol: string;
    nextEarningsDate: string | null;
    daysToEarnings: number | null;
    earningsHour: string | null; // "bmo" (before market open) or "amc" (after market close)
    epsEstimate: number | null;
    revenueEstimate: number | null;
}

function getCacheKey(symbol: string): string {
    return symbol.toUpperCase();
}

function getFromCache(symbol: string): EarningsCalendarData | null {
    const cached = earningsCache.get(getCacheKey(symbol));
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
    }
    return null;
}

function saveToCache(symbol: string, data: EarningsCalendarData): void {
    earningsCache.set(getCacheKey(symbol), {
        data,
        fetchedAt: Date.now(),
    });
}

export function clearEarningsCache(): void {
    earningsCache.clear();
    logger.info("DATA_FETCH", "Earnings calendar cache cleared");
}

export async function fetchEarningsCalendar(symbol: string): Promise<EarningsCalendarData | null> {
    const upperSymbol = symbol.toUpperCase();
    const log = logger.withContext({ symbol: upperSymbol, provider: "Finnhub" });

    // Check cache first
    const cached = getFromCache(upperSymbol);
    if (cached) {
        log.info("CACHE_HIT", `Using cached earnings data for ${upperSymbol}`);
        return cached;
    }

    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        log.warn("DATA_FETCH", "FINNHUB_API_KEY not configured for earnings calendar");
        return null;
    }

    try {
        // Fetch earnings calendar for the next 90 days
        const today = new Date();
        const fromDate = today.toISOString().split("T")[0];
        const toDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const url = `${FINNHUB_BASE_URL}/calendar/earnings?symbol=${upperSymbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

        log.dataFetch(`Fetching earnings calendar for ${upperSymbol}`);

        const response = await rateLimitedFetch(url);

        if (!response.ok) {
            log.providerFailure(`Earnings calendar API failed: ${response.status}`);
            return null;
        }

        const data: FinnhubEarningsResponse = await response.json();

        if (!data.earningsCalendar || data.earningsCalendar.length === 0) {
            // No upcoming earnings found - this is valid, not an error
            const result: EarningsCalendarData = {
                symbol: upperSymbol,
                nextEarningsDate: null,
                daysToEarnings: null,
                earningsHour: null,
                epsEstimate: null,
                revenueEstimate: null,
            };
            saveToCache(upperSymbol, result);
            log.dataFetch(`No upcoming earnings found for ${upperSymbol}`);
            return result;
        }

        // Find the first upcoming earnings date
        const upcomingEarnings = data.earningsCalendar
            .filter((e) => new Date(e.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

        if (!upcomingEarnings) {
            const result: EarningsCalendarData = {
                symbol: upperSymbol,
                nextEarningsDate: null,
                daysToEarnings: null,
                earningsHour: null,
                epsEstimate: null,
                revenueEstimate: null,
            };
            saveToCache(upperSymbol, result);
            return result;
        }

        const earningsDate = new Date(upcomingEarnings.date);
        const daysToEarnings = Math.ceil(
            (earningsDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
        );

        const result: EarningsCalendarData = {
            symbol: upperSymbol,
            nextEarningsDate: upcomingEarnings.date,
            daysToEarnings,
            earningsHour: upcomingEarnings.hour || null,
            epsEstimate: upcomingEarnings.epsEstimate,
            revenueEstimate: upcomingEarnings.revenueEstimate,
        };

        saveToCache(upperSymbol, result);

        log.dataFetch(
            `Fetched earnings for ${upperSymbol}: ${upcomingEarnings.date} (${daysToEarnings} days)`,
            { daysToEarnings }
        );

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.providerFailure(`Earnings calendar fetch error: ${errorMessage}`);
        return null;
    }
}
