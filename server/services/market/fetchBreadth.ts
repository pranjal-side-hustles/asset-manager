import { BreadthData, BreadthHealth } from "../../../shared/types/marketContext";
import { logger } from "../../infra/logging/logger";

interface BreadthResult {
  breadth: BreadthData;
  providersUsed: string[];
  providersFailed: string[];
  isEstimated: boolean;
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

  if (indexChanges) {
    logger.dataFetch("Estimating breadth from index performance");
    
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
