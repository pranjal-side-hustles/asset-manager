import type { StockSnapshot } from "@shared/types";
import type { StrategicInputs } from "./rules";

export function convertSnapshotToStrategicInputs(
  snapshot: StockSnapshot,
  portfolioContext?: {
    portfolioConcentration?: number;
    sectorExposure?: number;
    daysInPosition?: number;
    maxHoldingPeriod?: number;
  }
): StrategicInputs {
  const avgRevenueGrowth = snapshot.fundamentals.revenueGrowthYoY.length > 0
    ? snapshot.fundamentals.revenueGrowthYoY.reduce((a, b) => a + b, 0) / snapshot.fundamentals.revenueGrowthYoY.length
    : 0;

  const avgEpsGrowth = snapshot.fundamentals.epsGrowthYoY.length > 0
    ? snapshot.fundamentals.epsGrowthYoY.reduce((a, b) => a + b, 0) / snapshot.fundamentals.epsGrowthYoY.length
    : 0;

  const earningsAcceleration = snapshot.fundamentals.epsGrowthYoY.length >= 2
    ? snapshot.fundamentals.epsGrowthYoY[0] - snapshot.fundamentals.epsGrowthYoY[1]
    : avgEpsGrowth;

  const weeklyMaAlignment = 
    snapshot.technicals.movingAverages.ma50 > snapshot.technicals.movingAverages.ma200 &&
    snapshot.price > snapshot.technicals.movingAverages.ma50;

  let institutionalActivity: "buying" | "neutral" | "selling" = "neutral";
  if (snapshot.sentiment.institutionalTrend === "INCREASING") {
    institutionalActivity = "buying";
  } else if (snapshot.sentiment.institutionalTrend === "DECREASING") {
    institutionalActivity = "selling";
  }

  let marketTrend: "bullish" | "neutral" | "bearish" = "neutral";
  if (snapshot.technicals.weeklyTrend === "UP") {
    marketTrend = "bullish";
  } else if (snapshot.technicals.weeklyTrend === "DOWN") {
    marketTrend = "bearish";
  }

  return {
    portfolioConcentration: portfolioContext?.portfolioConcentration ?? 10,
    sectorExposure: portfolioContext?.sectorExposure ?? 15,
    vixLevel: 18,
    marketTrend,
    gdpGrowth: 2.5,
    interestRateTrend: "stable",
    institutionalOwnership: snapshot.sentiment.institutionalOwnership ?? 50,
    recentInstitutionalActivity: institutionalActivity,
    revenueGrowth: avgRevenueGrowth,
    earningsAcceleration,
    weeklyMaAlignment,
    weeklyRsiLevel: snapshot.technicals.rsi,
    daysInPosition: portfolioContext?.daysInPosition ?? 0,
    maxHoldingPeriod: portfolioContext?.maxHoldingPeriod ?? 180,
  };
}
