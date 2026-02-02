import { logger } from "../../infra/logging/logger";
import { getDataMode } from "../../domain/dataMode";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export type MarketCapCategory = "megaCap" | "largeCap" | "midCap" | "smallCap";

export interface UniverseStock {
    symbol: string;
    companyName: string;
    marketCapCategory: MarketCapCategory;
    indices: string[];
    sector?: string;
    avgDailyDollarVolume?: number;
}

interface UniverseCache {
    stocks: UniverseStock[];
    builtAt: number;
    version: string;
}

// ============================================================================
// CONFIG & CACHE
// ============================================================================

const CACHE_FILE = path.join(process.cwd(), ".cache", "universe.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const UNIVERSE_VERSION = "1.0.0";

let memoryCache: UniverseCache | null = null;
let bootstrapPromise: Promise<UniverseStock[]> | null = null;

// ============================================================================
// STATIC UNIVERSE (Phase 1)
// ============================================================================

/**
 * Static universe constituents organized by index and market cap.
 * Target: 800-1500 stocks
 * Current: ~150 high-quality names for demonstration
 */

// S&P 500 Core (Top 50 by market cap)
const SP500_CORE: UniverseStock[] = [
    // Mega Cap (> $200B)
    { symbol: "AAPL", companyName: "Apple Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "MSFT", companyName: "Microsoft Corporation", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "GOOGL", companyName: "Alphabet Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Communication Services" },
    { symbol: "AMZN", companyName: "Amazon.com Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Consumer Discretionary" },
    { symbol: "NVDA", companyName: "NVIDIA Corporation", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "META", companyName: "Meta Platforms Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Communication Services" },
    { symbol: "TSLA", companyName: "Tesla Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Consumer Discretionary" },
    { symbol: "AVGO", companyName: "Broadcom Inc.", marketCapCategory: "megaCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "LLY", companyName: "Eli Lilly and Company", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "UNH", companyName: "UnitedHealth Group Inc.", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "V", companyName: "Visa Inc.", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "JNJ", companyName: "Johnson & Johnson", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "WMT", companyName: "Walmart Inc.", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Consumer Staples" },
    { symbol: "XOM", companyName: "Exxon Mobil Corporation", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Energy" },
    { symbol: "JPM", companyName: "JPMorgan Chase & Co.", marketCapCategory: "megaCap", indices: ["SPY"], sector: "Financial Services" },

    // Large Cap ($10B - $200B)
    { symbol: "MA", companyName: "Mastercard Incorporated", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "HD", companyName: "The Home Depot Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Consumer Discretionary" },
    { symbol: "PG", companyName: "Procter & Gamble Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Consumer Staples" },
    { symbol: "COST", companyName: "Costco Wholesale Corporation", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Consumer Staples" },
    { symbol: "ABBV", companyName: "AbbVie Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "CRM", companyName: "Salesforce Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "NFLX", companyName: "Netflix Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Communication Services" },
    { symbol: "AMD", companyName: "Advanced Micro Devices Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "ORCL", companyName: "Oracle Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Technology" },
    { symbol: "ADBE", companyName: "Adobe Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "MRK", companyName: "Merck & Co. Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "PEP", companyName: "PepsiCo Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Consumer Staples" },
    { symbol: "KO", companyName: "The Coca-Cola Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Consumer Staples" },
    { symbol: "TMO", companyName: "Thermo Fisher Scientific Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "CSCO", companyName: "Cisco Systems Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "ACN", companyName: "Accenture plc", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Technology" },
    { symbol: "ABT", companyName: "Abbott Laboratories", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "DHR", companyName: "Danaher Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Healthcare" },
    { symbol: "INTC", companyName: "Intel Corporation", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "VZ", companyName: "Verizon Communications Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Communication Services" },
    { symbol: "DIS", companyName: "The Walt Disney Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Communication Services" },
    { symbol: "CMCSA", companyName: "Comcast Corporation", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Communication Services" },
    { symbol: "NKE", companyName: "NIKE Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Consumer Discretionary" },
    { symbol: "TXN", companyName: "Texas Instruments Inc.", marketCapCategory: "largeCap", indices: ["SPY", "QQQ"], sector: "Technology" },
    { symbol: "PM", companyName: "Philip Morris International Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Consumer Staples" },
];

// Nasdaq 100 Growth Names (not in S&P 500 core)
const NASDAQ_GROWTH: UniverseStock[] = [
    { symbol: "MELI", companyName: "MercadoLibre Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Consumer Discretionary" },
    { symbol: "PANW", companyName: "Palo Alto Networks Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "MRVL", companyName: "Marvell Technology Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "LRCX", companyName: "Lam Research Corporation", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "KLAC", companyName: "KLA Corporation", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "SNPS", companyName: "Synopsys Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "CDNS", companyName: "Cadence Design Systems Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "WDAY", companyName: "Workday Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "TEAM", companyName: "Atlassian Corporation", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "DXCM", companyName: "DexCom Inc.", marketCapCategory: "largeCap", indices: ["QQQ"], sector: "Healthcare" },
];

// Mid Cap Growth ($2B - $10B)
const MID_CAP_GROWTH: UniverseStock[] = [
    { symbol: "CRWD", companyName: "CrowdStrike Holdings Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "DDOG", companyName: "Datadog Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "ZS", companyName: "Zscaler Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "NET", companyName: "Cloudflare Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "SNOW", companyName: "Snowflake Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "MDB", companyName: "MongoDB Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "OKTA", companyName: "Okta Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "TTD", companyName: "The Trade Desk Inc.", marketCapCategory: "midCap", indices: ["QQQ"], sector: "Technology" },
    { symbol: "HUBS", companyName: "HubSpot Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "VEEV", companyName: "Veeva Systems Inc.", marketCapCategory: "midCap", indices: [], sector: "Healthcare" },
    { symbol: "BILL", companyName: "BILL Holdings Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "PCTY", companyName: "Paylocity Holding Corporation", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "GLBE", companyName: "Global-E Online Ltd.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "CFLT", companyName: "Confluent Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
    { symbol: "GTLB", companyName: "GitLab Inc.", marketCapCategory: "midCap", indices: [], sector: "Technology" },
];

// Small Cap High Growth ($300M - $2B)
const SMALL_CAP_GROWTH: UniverseStock[] = [
    { symbol: "PLTR", companyName: "Palantir Technologies Inc.", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
    { symbol: "SOFI", companyName: "SoFi Technologies Inc.", marketCapCategory: "smallCap", indices: [], sector: "Financial Services" },
    { symbol: "AFRM", companyName: "Affirm Holdings Inc.", marketCapCategory: "smallCap", indices: [], sector: "Financial Services" },
    { symbol: "UPST", companyName: "Upstart Holdings Inc.", marketCapCategory: "smallCap", indices: [], sector: "Financial Services" },
    { symbol: "HOOD", companyName: "Robinhood Markets Inc.", marketCapCategory: "smallCap", indices: [], sector: "Financial Services" },
    { symbol: "PATH", companyName: "UiPath Inc.", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
    { symbol: "U", companyName: "Unity Software Inc.", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
    { symbol: "RBLX", companyName: "Roblox Corporation", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
    { symbol: "IONQ", companyName: "IonQ Inc.", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
    { symbol: "SMCI", companyName: "Super Micro Computer Inc.", marketCapCategory: "smallCap", indices: [], sector: "Technology" },
];

// Value / Dividend Names (diversification)
const VALUE_DIVIDEND: UniverseStock[] = [
    { symbol: "CVX", companyName: "Chevron Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Energy" },
    { symbol: "COP", companyName: "ConocoPhillips", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Energy" },
    { symbol: "SLB", companyName: "Schlumberger Limited", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Energy" },
    { symbol: "EOG", companyName: "EOG Resources Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Energy" },
    { symbol: "GS", companyName: "The Goldman Sachs Group Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "MS", companyName: "Morgan Stanley", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "BLK", companyName: "BlackRock Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "SCHW", companyName: "The Charles Schwab Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "C", companyName: "Citigroup Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "BAC", companyName: "Bank of America Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "WFC", companyName: "Wells Fargo & Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "USB", companyName: "U.S. Bancorp", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Financial Services" },
    { symbol: "CAT", companyName: "Caterpillar Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "DE", companyName: "Deere & Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "UNP", companyName: "Union Pacific Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "HON", companyName: "Honeywell International Inc.", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "MMM", companyName: "3M Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "GE", companyName: "General Electric Company", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "RTX", companyName: "RTX Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
    { symbol: "LMT", companyName: "Lockheed Martin Corporation", marketCapCategory: "largeCap", indices: ["SPY"], sector: "Industrials" },
];

// ============================================================================
// BOOTSTRAP & CACHE MANAGEMENT
// ============================================================================

/**
 * Bootstrap the tracked universe.
 * Validates API keys and builds the final stock list.
 * Caches result for 24 hours.
 */
export async function bootstrapUniverse(): Promise<UniverseStock[]> {
    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
        try {
            const now = Date.now();

            // 1. Check memory cache
            if (memoryCache && (now - memoryCache.builtAt) < CACHE_TTL_MS) {
                logger.cacheHit(`Universe memory cache hit (age: ${Math.round((now - memoryCache.builtAt) / 1000)}s)`);
                return memoryCache.stocks;
            }

            // 2. Check filesystem cache
            if (fs.existsSync(CACHE_FILE)) {
                try {
                    const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
                    const cache: UniverseCache = JSON.parse(fileContent);

                    if ((now - cache.builtAt) < CACHE_TTL_MS && cache.version === UNIVERSE_VERSION) {
                        logger.cacheHit(`Universe file cache hit (age: ${Math.round((now - cache.builtAt) / 1000)}s)`);
                        memoryCache = cache;
                        return cache.stocks;
                    }
                } catch (e) {
                    logger.warn("DATA_FETCH", "Failed to read universe cache file");
                }
            }

            const allStocks = [
                ...SP500_CORE,
                ...NASDAQ_GROWTH,
                ...MID_CAP_GROWTH,
                ...SMALL_CAP_GROWTH,
                ...VALUE_DIVIDEND,
            ];

            // 3. Build Fresh Universe (requires API keys for dynamic build, else fallback to static)
            if (getDataMode() === "DEMO") {
                logger.warn("FALLBACK", "No API keys configured. Using static Failsafe Universe (Demo Mode).");

                // Return static list as failsafe
                return allStocks.reduce((acc, stock) => {
                    if (!acc.find(s => s.symbol === stock.symbol)) {
                        acc.push(stock);
                    }
                    return acc;
                }, [] as UniverseStock[]);
            }

            logger.info("DATA_FETCH", "Building tracked universe...");

            // Remove duplicates by symbol
            const stocks = allStocks.reduce((acc, stock) => {
                if (!acc.find(s => s.symbol === stock.symbol)) {
                    acc.push(stock);
                }
                return acc;
            }, [] as UniverseStock[]);

            // 4. Save to cache
            const newCache: UniverseCache = {
                stocks,
                builtAt: now,
                version: UNIVERSE_VERSION
            };

            memoryCache = newCache;

            try {
                const cacheDir = path.dirname(CACHE_FILE);
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                fs.writeFileSync(CACHE_FILE, JSON.stringify(newCache), "utf-8");
                logger.info("DATA_FETCH", `Universe persisted to ${CACHE_FILE}`);
            } catch (e) {
                logger.warn("DATA_FETCH", "Failed to persist universe cache to disk");
            }

            logger.dataFetch(`Tracked universe bootstrapped with ${stocks.length} stocks`, { categories: Object.keys(stocks) });
            return stocks;
        } catch (error) {
            logger.error("DATA_FETCH", "Universe bootstrap failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        } finally {
            bootstrapPromise = null;
        }
    })();

    return bootstrapPromise;
}

/**
 * Get the complete tracked universe (ensures bootstrap is complete).
 */
export async function getTrackedUniverse(): Promise<UniverseStock[]> {
    return bootstrapUniverse();
}

/**
 * Check if the current universe is in Demo Mode (built from static list).
 */
export function isUniverseDemoMode(): boolean {
    return getDataMode() === "DEMO";
}

/**
 * Get universe stocks by market cap category.
 */
export async function getUniverseByMarketCap(category: MarketCapCategory): Promise<UniverseStock[]> {
    const universe = await getTrackedUniverse();
    return universe.filter(s => s.marketCapCategory === category);
}

/**
 * Get universe stocks by index membership.
 */
export async function getUniverseByIndex(index: "SPY" | "QQQ"): Promise<UniverseStock[]> {
    const universe = await getTrackedUniverse();
    return universe.filter(s => s.indices.includes(index));
}

/**
 * Get a diversified sample of stocks for dashboard display.
 * Ensures market cap diversity.
 */
export async function getDashboardSample(count: number = 9): Promise<string[]> {
    const universe = await getTrackedUniverse();

    // Target distribution for diversity
    const megaCount = Math.ceil(count * 0.4);  // 40% mega cap
    const largeCount = Math.ceil(count * 0.3); // 30% large cap
    const midCount = Math.ceil(count * 0.2);   // 20% mid cap
    const smallCount = count - megaCount - largeCount - midCount; // remainder

    const megaCaps = universe.filter(s => s.marketCapCategory === "megaCap").slice(0, megaCount);
    const largeCaps = universe.filter(s => s.marketCapCategory === "largeCap").slice(0, largeCount);
    const midCaps = universe.filter(s => s.marketCapCategory === "midCap").slice(0, midCount);
    const smallCaps = universe.filter(s => s.marketCapCategory === "smallCap").slice(0, smallCount);

    const selected = [...megaCaps, ...largeCaps, ...midCaps, ...smallCaps];
    return selected.map(s => s.symbol);
}

/**
 * Get symbols for a diversified list view.
 * Applies market cap diversity rules.
 */
export async function getListViewSample(
    filter: "ready" | "watching" | "shape" | "force",
    maxCount: number = 15
): Promise<string[]> {
    const universe = await getTrackedUniverse();

    // For list views, we want broader coverage
    // Target: 2-3 mega, 3-4 large, 3-4 mid, 2-3 small
    const megaCaps = universe.filter(s => s.marketCapCategory === "megaCap").slice(0, 3);
    const largeCaps = universe.filter(s => s.marketCapCategory === "largeCap").slice(0, 4);
    const midCaps = universe.filter(s => s.marketCapCategory === "midCap").slice(0, 4);
    const smallCaps = universe.filter(s => s.marketCapCategory === "smallCap").slice(0, 4);

    const selected = [...megaCaps, ...largeCaps, ...midCaps, ...smallCaps];
    return selected.slice(0, maxCount).map(s => s.symbol);
}

/**
 * Look up market cap category for a symbol.
 */
export async function getMarketCapCategory(symbol: string): Promise<MarketCapCategory | null> {
    const universe = await getTrackedUniverse();
    const stock = universe.find(s => s.symbol === symbol);
    return stock?.marketCapCategory ?? null;
}

/**
 * Look up company info for a symbol.
 */
export async function getUniverseStock(symbol: string): Promise<UniverseStock | null> {
    const universe = await getTrackedUniverse();
    return universe.find(s => s.symbol === symbol) ?? null;
}

// ============================================================================
// UNIVERSE STATS
// ============================================================================

export async function getUniverseStats(): Promise<{
    total: number;
    byMarketCap: Record<MarketCapCategory, number>;
    byIndex: Record<string, number>;
}> {
    const universe = await getTrackedUniverse();

    return {
        total: universe.length,
        byMarketCap: {
            megaCap: universe.filter(s => s.marketCapCategory === "megaCap").length,
            largeCap: universe.filter(s => s.marketCapCategory === "largeCap").length,
            midCap: universe.filter(s => s.marketCapCategory === "midCap").length,
            smallCap: universe.filter(s => s.marketCapCategory === "smallCap").length,
        },
        byIndex: {
            SPY: universe.filter(s => s.indices.includes("SPY")).length,
            QQQ: universe.filter(s => s.indices.includes("QQQ")).length,
        },
    };
}
