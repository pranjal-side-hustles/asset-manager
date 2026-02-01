import { RankedStock, CapitalPriority } from "@shared/types/ranking";

interface RankingInput {
  symbol: string;
  sector: string;
  strategicScore: number;
  tacticalScore: number;
  strategicStatus: "ELIGIBLE" | "WATCH" | "REJECT";
  tacticalStatus: "TRADE" | "WATCH" | "AVOID";
  sectorRegime: "FAVORED" | "NEUTRAL" | "AVOID";
  portfolioAction: "ALLOW" | "REDUCE" | "BLOCK";
}

export function rankStocks(
  stocks: RankingInput[]
): RankedStock[] {
  // Group by sector
  const bySector: Record<string, RankingInput[]> = {};
  for (const stock of stocks) {
    bySector[stock.sector] ??= [];
    bySector[stock.sector].push(stock);
  }

  const ranked: RankedStock[] = [];

  for (const sector of Object.keys(bySector)) {
    const sectorStocks = bySector[sector]
      .filter(s => s.strategicStatus !== "REJECT")
      .sort((a, b) => b.strategicScore - a.strategicScore);

    sectorStocks.forEach((stock, index) => {
      const rankInSector = index + 1;
      const reasons: string[] = [];

      let capitalPriority: CapitalPriority = "WATCH";

      // Hard blocks
      if (
        stock.portfolioAction === "BLOCK" ||
        stock.sectorRegime === "AVOID"
      ) {
        capitalPriority = "BLOCKED";
        reasons.push("Capital blocked by portfolio or sector regime");
      }
      // Tactical opportunity
      else if (
        stock.tacticalStatus === "TRADE" &&
        stock.portfolioAction === "ALLOW"
      ) {
        capitalPriority = "BUY";
        reasons.push("Active tactical opportunity with capital available");
      }
      // Strategic accumulation
      else if (
        stock.strategicStatus === "ELIGIBLE" &&
        stock.sectorRegime === "FAVORED" &&
        rankInSector <= 2
      ) {
        capitalPriority = "ACCUMULATE";
        reasons.push("Top-ranked stock in favored sector");
      }
      // Early pilot position
      // Note: sectorRegime !== "AVOID" is guaranteed here (caught by BLOCKED check above)
      else if (
        stock.strategicStatus === "WATCH" &&
        rankInSector === 1
      ) {
        capitalPriority = "PILOT";
        reasons.push("Best-in-sector watch candidate");
      }

      ranked.push({
        ...stock,
        rankInSector,
        capitalPriority,
        reasons,
      });
    });
  }

  return ranked;
}
