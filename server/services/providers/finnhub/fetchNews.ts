import { rateLimitedFetch } from "./rateLimiter";
import { logger } from "../../../infra/logging/logger";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

// Cache news data for 5 minutes
const newsCache = new Map<string, { data: NewsData; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface FinnhubNewsItem {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

export interface NewsData {
    symbol: string;
    recentNewsCount: number;
    latestNewsDate: string | null;
    hasRecentNews: boolean; // News within last 24 hours
    hasMajorNews: boolean; // Approximated by high news volume
    headlines: string[];
    sentimentScore: number; // Simple sentiment: -1 to +1 based on keyword analysis
}

function getCacheKey(symbol: string): string {
    return symbol.toUpperCase();
}

function getFromCache(symbol: string): NewsData | null {
    const cached = newsCache.get(getCacheKey(symbol));
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.data;
    }
    return null;
}

function saveToCache(symbol: string, data: NewsData): void {
    newsCache.set(getCacheKey(symbol), {
        data,
        fetchedAt: Date.now(),
    });
}

export function clearNewsCache(): void {
    newsCache.clear();
    logger.info("DATA_FETCH", "News cache cleared");
}

// Simple keyword-based sentiment analysis
function analyzeHeadlineSentiment(headlines: string[]): number {
    if (headlines.length === 0) return 0;

    const positiveKeywords = [
        "beat", "beats", "exceeds", "surges", "jumps", "soars", "gains", "rises",
        "upgrade", "upgraded", "buy", "strong", "growth", "profit", "record",
        "breakthrough", "success", "bullish", "positive", "outperform"
    ];

    const negativeKeywords = [
        "miss", "misses", "falls", "drops", "plunges", "declines", "loses",
        "downgrade", "downgraded", "sell", "weak", "loss", "warning", "concern",
        "lawsuit", "investigation", "bearish", "negative", "underperform", "cut"
    ];

    let score = 0;
    let analyzed = 0;

    for (const headline of headlines) {
        const lower = headline.toLowerCase();
        let headlineScore = 0;

        for (const keyword of positiveKeywords) {
            if (lower.includes(keyword)) {
                headlineScore += 0.2;
            }
        }

        for (const keyword of negativeKeywords) {
            if (lower.includes(keyword)) {
                headlineScore -= 0.2;
            }
        }

        // Clamp individual headline score
        headlineScore = Math.max(-1, Math.min(1, headlineScore));
        score += headlineScore;
        analyzed++;
    }

    // Average and clamp final score
    const avgScore = analyzed > 0 ? score / analyzed : 0;
    return Math.max(-1, Math.min(1, Math.round(avgScore * 100) / 100));
}

export async function fetchNews(symbol: string): Promise<NewsData | null> {
    const upperSymbol = symbol.toUpperCase();
    const log = logger.withContext({ symbol: upperSymbol, provider: "Finnhub" });

    // Check cache first
    const cached = getFromCache(upperSymbol);
    if (cached) {
        log.info("CACHE_HIT", `Using cached news data for ${upperSymbol}`);
        return cached;
    }

    const apiKey = process.env.FINNHUB_API_KEY;

    if (!apiKey) {
        log.warn("DATA_FETCH", "FINNHUB_API_KEY not configured for news");
        return null;
    }

    try {
        // Fetch news from last 7 days
        const today = new Date();
        const toDate = today.toISOString().split("T")[0];
        const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const url = `${FINNHUB_BASE_URL}/company-news?symbol=${upperSymbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`;

        log.dataFetch(`Fetching news for ${upperSymbol}`);

        const response = await rateLimitedFetch(url);

        if (!response.ok) {
            log.providerFailure(`News API failed: ${response.status}`);
            return null;
        }

        const newsItems: FinnhubNewsItem[] = await response.json();

        // Check for recent news (within last 24 hours)
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentNews = newsItems.filter(
            (item) => item.datetime * 1000 >= oneDayAgo
        );

        // Extract headlines (most recent 10)
        const headlines = newsItems
            .slice(0, 10)
            .map((item) => item.headline);

        // Approximate "major news" as having 5+ news items in 7 days
        const hasMajorNews = newsItems.length >= 5;

        const result: NewsData = {
            symbol: upperSymbol,
            recentNewsCount: newsItems.length,
            latestNewsDate:
                newsItems.length > 0
                    ? new Date(newsItems[0].datetime * 1000).toISOString()
                    : null,
            hasRecentNews: recentNews.length > 0,
            hasMajorNews,
            headlines,
            sentimentScore: analyzeHeadlineSentiment(headlines),
        };

        saveToCache(upperSymbol, result);

        log.dataFetch(
            `Fetched ${newsItems.length} news items for ${upperSymbol}`,
            {
                recentCount: recentNews.length,
                sentimentScore: result.sentimentScore,
            }
        );

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.providerFailure(`News fetch error: ${errorMessage}`);
        return null;
    }
}
