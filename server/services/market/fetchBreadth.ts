import { BreadthData, BreadthHealth } from "../../../shared/types/marketContext";
import { fetchWithRetry } from "../../infra/network/fetchWithRetry";
import { providerGuard } from "../../infra/network/providerGuard";
import { logger } from "../../infra/logging/logger";

const FMP_API_KEY = process.env.FMP_API_KEY;

interface BreadthResult {
  breadth: BreadthData;
  providersUsed: string[];
  providersFailed: string[];
  isEstimated: boolean;
}

async function fetchSP500Constituents(): Promise<string[] | null> {
  if (!FMP_API_KEY || !providerGuard.isAvailable("FMP")) {
    return null;
  }

  try {
    const url = `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${FMP_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 10000 });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map((item: { symbol: string }) => item.symbol).slice(0, 50);
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchStockAboveMA(symbol: string): Promise<boolean | null> {
  if (!FMP_API_KEY) return null;

  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${FMP_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 5000 });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (Array.isArray(data) && data[0]) {
      return data[0].priceAvg200 ? data[0].price > data[0].priceAvg200 : null;
    }
    return null;
  } catch {
    return null;
  }
}

function determineBreadthHealth(pctAbove200DMA: number, advanceDeclineRatio: number): BreadthHealth {
  if (pctAbove200DMA >= 60 && advanceDeclineRatio >= 1.2) {
    return "STRONG";
  }
  if (pctAbove200DMA <= 40 || advanceDeclineRatio < 0.8) {
    return "WEAK";
  }
  return "NEUTRAL";
}

function estimateBreadthFromIndices(spyChange: number, qqqChange: number, iwmChange: number): BreadthData {
  const avgChange = (spyChange + qqqChange + iwmChange) / 3;
  
  let pctAbove200DMA: number;
  let advanceDeclineRatio: number;
  
  if (avgChange > 1) {
    pctAbove200DMA = 65 + Math.min(avgChange * 2, 15);
    advanceDeclineRatio = 1.5 + Math.min(avgChange * 0.2, 0.5);
  } else if (avgChange > 0) {
    pctAbove200DMA = 50 + avgChange * 10;
    advanceDeclineRatio = 1.0 + avgChange * 0.3;
  } else if (avgChange > -1) {
    pctAbove200DMA = 50 + avgChange * 10;
    advanceDeclineRatio = 1.0 + avgChange * 0.3;
  } else {
    pctAbove200DMA = 35 + Math.max(avgChange * 2, -15);
    advanceDeclineRatio = 0.6 + Math.max(avgChange * 0.1, -0.3);
  }

  pctAbove200DMA = Math.max(20, Math.min(80, pctAbove200DMA));
  advanceDeclineRatio = Math.max(0.3, Math.min(2.5, advanceDeclineRatio));

  const newHighsLowsRatio = advanceDeclineRatio * 0.8;

  return {
    pctAbove200DMA: Math.round(pctAbove200DMA * 10) / 10,
    advanceDeclineRatio: Math.round(advanceDeclineRatio * 100) / 100,
    newHighsLowsRatio: Math.round(newHighsLowsRatio * 100) / 100,
    health: determineBreadthHealth(pctAbove200DMA, advanceDeclineRatio),
  };
}

export async function fetchMarketBreadth(
  indexChanges?: { spy: number; qqq: number; iwm: number }
): Promise<BreadthResult> {
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];

  const constituents = await fetchSP500Constituents();
  
  if (!constituents || constituents.length < 20) {
    providersFailed.push("FMP-Constituents");
    
    if (indexChanges) {
      logger.fallback("Using estimated breadth from index performance");
      
      return {
        breadth: estimateBreadthFromIndices(
          indexChanges.spy,
          indexChanges.qqq,
          indexChanges.iwm
        ),
        providersUsed: ["Estimated"],
        providersFailed,
        isEstimated: true,
      };
    }

    return {
      breadth: {
        pctAbove200DMA: 50,
        advanceDeclineRatio: 1.0,
        newHighsLowsRatio: 1.0,
        health: "NEUTRAL",
      },
      providersUsed: ["Default"],
      providersFailed,
      isEstimated: true,
    };
  }

  providersUsed.push("FMP-Constituents");

  const sampleSize = Math.min(30, constituents.length);
  const sampledSymbols = constituents.slice(0, sampleSize);

  const results = await Promise.all(
    sampledSymbols.map((symbol) => fetchStockAboveMA(symbol))
  );

  const validResults = results.filter((r): r is boolean => r !== null);
  
  if (validResults.length < 10) {
    providersFailed.push("FMP-Quotes");
    
    if (indexChanges) {
      return {
        breadth: estimateBreadthFromIndices(
          indexChanges.spy,
          indexChanges.qqq,
          indexChanges.iwm
        ),
        providersUsed,
        providersFailed,
        isEstimated: true,
      };
    }

    return {
      breadth: {
        pctAbove200DMA: 50,
        advanceDeclineRatio: 1.0,
        newHighsLowsRatio: 1.0,
        health: "NEUTRAL",
      },
      providersUsed,
      providersFailed,
      isEstimated: true,
    };
  }

  providersUsed.push("FMP-Quotes");
  providerGuard.recordSuccess("FMP");

  const aboveCount = validResults.filter((r) => r).length;
  const pctAbove200DMA = (aboveCount / validResults.length) * 100;
  
  const advanceDeclineRatio = aboveCount > 0 
    ? aboveCount / (validResults.length - aboveCount || 1)
    : 0.5;

  const newHighsLowsRatio = advanceDeclineRatio * 0.7 + 0.3;

  const breadth: BreadthData = {
    pctAbove200DMA: Math.round(pctAbove200DMA * 10) / 10,
    advanceDeclineRatio: Math.round(advanceDeclineRatio * 100) / 100,
    newHighsLowsRatio: Math.round(newHighsLowsRatio * 100) / 100,
    health: determineBreadthHealth(pctAbove200DMA, advanceDeclineRatio),
  };

  logger.dataFetch(
    `Breadth: ${pctAbove200DMA.toFixed(1)}% above 200DMA, A/D ratio: ${advanceDeclineRatio.toFixed(2)}`
  );

  return {
    breadth,
    providersUsed,
    providersFailed,
    isEstimated: false,
  };
}
