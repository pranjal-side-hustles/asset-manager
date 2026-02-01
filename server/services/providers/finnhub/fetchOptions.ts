import { rateLimitedFetch } from "./rateLimiter";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

interface FinnhubOptionChain {
  code: string;
  exchange: string;
  data: Array<{
    expirationDate: string;
    options: {
      CALL: OptionData[];
      PUT: OptionData[];
    };
  }>;
}

interface OptionData {
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  percentChange: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

export interface FinnhubOptionsData {
  impliedVolatility?: number;
  ivRank?: number;
  totalOpenInterest: number;
  callOpenInterest: number;
  putOpenInterest: number;
  putCallRatio: number;
}

export async function fetchFinnhubOptions(symbol: string): Promise<FinnhubOptionsData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.warn("[Finnhub] No API key configured");
    return null;
  }

  try {
    const response = await rateLimitedFetch(
      `${FINNHUB_BASE_URL}/stock/option-chain?symbol=${symbol}&token=${apiKey}`
    );

    if (!response.ok) {
      console.warn(`[Finnhub] Failed to fetch options for ${symbol}`);
      return null;
    }

    const data: FinnhubOptionChain = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return null;
    }

    let totalCallOI = 0;
    let totalPutOI = 0;
    let totalIV = 0;
    let ivCount = 0;

    for (const expiration of data.data.slice(0, 4)) {
      const calls = expiration.options?.CALL || [];
      const puts = expiration.options?.PUT || [];

      for (const call of calls) {
        totalCallOI += call.openInterest || 0;
        if (call.impliedVolatility) {
          totalIV += call.impliedVolatility;
          ivCount++;
        }
      }

      for (const put of puts) {
        totalPutOI += put.openInterest || 0;
        if (put.impliedVolatility) {
          totalIV += put.impliedVolatility;
          ivCount++;
        }
      }
    }

    const avgIV = ivCount > 0 ? totalIV / ivCount : undefined;
    const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    return {
      impliedVolatility: avgIV,
      totalOpenInterest: totalCallOI + totalPutOI,
      callOpenInterest: totalCallOI,
      putOpenInterest: totalPutOI,
      putCallRatio
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching options for ${symbol}:`, error);
    return null;
  }
}
