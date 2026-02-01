import type { StockSnapshot } from "@shared/types";
import type { TacticalInputs } from "./rules";

export function convertSnapshotToTacticalInputs(
  snapshot: StockSnapshot,
  tradeContext?: {
    daysInTrade?: number;
    maxTradeDays?: number;
    daysToEarnings?: number;
    daysToExDividend?: number;
    hasUpcomingNews?: boolean;
  },
): TacticalInputs {
  const dailyMaAlignment =
    snapshot.price > snapshot.technicals.movingAverages.ma20 &&
    snapshot.technicals.movingAverages.ma20 >
      snapshot.technicals.movingAverages.ma50;

  const hourlyMaAlignment = snapshot.technicals.dailyTrend === "UP";

  const priceAboveVwap =
    snapshot.price > snapshot.technicals.movingAverages.ma20;

  let momentumScore = Math.max(45, snapshot.technicals.rsi);
  if (snapshot.technicals.dailyTrend === "UP") {
    momentumScore = Math.min(100, momentumScore + 10);
  } else if (snapshot.technicals.dailyTrend === "DOWN") {
    momentumScore = Math.max(0, momentumScore - 10);
  }

  let momentumDirection: "accelerating" | "stable" | "decelerating" = "stable";
  if (snapshot.technicals.rsi > 60) {
    momentumDirection = "accelerating";
  } else if (snapshot.technicals.rsi < 40) {
    momentumDirection = "decelerating";
  }

  let socialSentiment: "bullish" | "neutral" | "bearish" = "neutral";
  if (
    snapshot.sentiment.analystRating &&
    snapshot.sentiment.analystRating > 3.5
  ) {
    socialSentiment = "bullish";
  } else if (
    snapshot.sentiment.analystRating &&
    snapshot.sentiment.analystRating < 2.5
  ) {
    socialSentiment = "bearish";
  }

  const relativeStrength =
    snapshot.technicals.priceVsMA200 > 0
      ? Math.min(100, 50 + snapshot.technicals.priceVsMA200)
      : Math.max(0, 50 + snapshot.technicals.priceVsMA200);

  return {
    dailyMaAlignment,
    hourlyMaAlignment,
    priceAboveVwap,
    momentumScore,
    momentumDirection,
    averageVolume: snapshot.volume,
    currentVolume: snapshot.volume,
    bidAskSpread: 0.03,
    putCallRatio: snapshot.sentiment.putCallRatio ?? 0.8,
    socialSentiment,
    daysToEarnings: tradeContext?.daysToEarnings ?? 30,
    daysToExDividend: tradeContext?.daysToExDividend ?? 45,
    hasUpcomingNews: tradeContext?.hasUpcomingNews ?? false,
    daysInTrade: tradeContext?.daysInTrade ?? 0,
    maxTradeDays: tradeContext?.maxTradeDays ?? 30,
    relativeStrength,
    sectorRank: 5,
  };
}
