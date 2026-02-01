import { rateLimitedFetch } from "../providers/finnhub/rateLimiter";
import { logger } from "../../infra/logging/logger";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface StockSearchResult {
  symbol: string;
  description: string;
  type: string;
}

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  if (!query || query.length < 1) {
    return [];
  }

  if (!FINNHUB_API_KEY) {
    logger.warn("DATA_FETCH", "No Finnhub API key for stock search");
    return [];
  }

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      logger.warn("DATA_FETCH", `Finnhub search failed: ${response.status}`);
      return [];
    }

    const data: FinnhubSearchResult = await response.json();

    if (!data.result || data.result.length === 0) {
      return [];
    }

    // Filter to only common stocks (not preferred, ADRs, etc.) and US exchanges
    const filtered = data.result
      .filter((item) => {
        const isCommonStock = item.type === "Common Stock";
        const isUSExchange = !item.symbol.includes(".");
        return isCommonStock && isUSExchange;
      })
      .slice(0, 10)
      .map((item) => ({
        symbol: item.symbol,
        description: item.description,
        type: item.type,
      }));

    logger.dataFetch(`Stock search for "${query}": ${filtered.length} results`);

    return filtered;
  } catch (error) {
    logger.error("DATA_FETCH", `Stock search error: ${error}`);
    return [];
  }
}
