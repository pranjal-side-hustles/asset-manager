import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { StockCard } from "@/components/stock/StockCard";
import { MarketContextPanel } from "@/components/dashboard/MarketContextPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import type { DashboardResponse, DashboardStock } from "@shared/types";

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Market Context Skeleton */}
      <Card className="border-border/30 bg-card/10">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Tiles Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>

      {/* Stock Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/30 bg-card/10">
            <CardContent className="p-6 flex flex-col items-center space-y-4">
              <div className="w-full flex justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type FilterType = "all" | "ready" | "watching" | "shape" | "force";

const FILTER_LABELS: Record<FilterType, { title: string; subtitle: string }> = {
  all: { title: "All Stocks", subtitle: "" },
  ready: { title: "Ready Now", subtitle: "Stocks where structure and timing are aligned." },
  watching: { title: "Keep Watching", subtitle: "Strong businesses waiting for better conditions." },
  shape: { title: "SHAPE Overview", subtitle: "Stocks with the strongest business structure." },
  force: { title: "FORCE Overview", subtitle: "Stocks showing the strongest market activity." },
};

/**
 * Filter logic per user specification (DO NOT modify scoring logic, only inclusion criteria)
 */
function filterStocks(stocks: DashboardStock[], filter: FilterType, marketRegime?: string): DashboardStock[] {
  switch (filter) {
    case "ready":
      // READY NOW: FORCE ≥ 65, SHAPE ≥ 55, confirmation not NONE, no risk blocks, market ≠ Risk-Off
      // Sort by highest FORCE score (descending)
      return stocks.filter(s => {
        const forceOk = s.tacticalScore >= 65;
        const shapeOk = s.strategicScore >= 55;
        const hasConfirmation = s.decisionLabel?.label !== "KEEP_AN_EYE_ON" || s.tacticalScore >= 50;
        const noRiskBlocks = s.decisionLabel?.label !== "PAUSE";
        const marketOk = marketRegime !== "RISK_OFF";
        return forceOk && shapeOk && hasConfirmation && noRiskBlocks && marketOk;
      }).sort((a, b) => b.tacticalScore - a.tacticalScore);

    case "watching":
      // KEEP WATCHING: SHAPE ≥ 60 AND (FORCE 40-64 OR FORCE ≥ 65 with confirmation NONE OR market Risk-Off)
      // Sort by highest SHAPE score (descending)
      return stocks.filter(s => {
        const strongShape = s.strategicScore >= 60;
        const developingForce = s.tacticalScore >= 40 && s.tacticalScore < 65;
        const forceBlockedByConfirmation = s.tacticalScore >= 65 && s.decisionLabel?.label === "KEEP_AN_EYE_ON";
        const forceBlockedByMarket = s.tacticalScore >= 65 && marketRegime === "RISK_OFF";
        return strongShape && (developingForce || forceBlockedByConfirmation || forceBlockedByMarket);
      }).sort((a, b) => b.strategicScore - a.strategicScore);

    case "shape":
      // SHAPE OVERVIEW: SHAPE ≥ 65, sorted by highest SHAPE first
      return stocks
        .filter(s => s.strategicScore >= 65)
        .sort((a, b) => b.strategicScore - a.strategicScore);

    case "force":
      // FORCE OVERVIEW: FORCE ≥ 65, sorted by highest FORCE first
      return stocks
        .filter(s => s.tacticalScore >= 65)
        .sort((a, b) => b.tacticalScore - a.tacticalScore);

    default:
      return stocks;
  }
}

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { data, isLoading, error, refetch } = useQuery<DashboardResponse>({
    queryKey: ["/api/dashboard"],
  });

  const filteredStocks = useMemo(() => {
    if (!data?.stocks) return [];
    return filterStocks(data.stocks, activeFilter, data.marketRegime);
  }, [data?.stocks, data?.marketRegime, activeFilter]);

  const handleSummaryClick = (filter: string) => {
    setActiveFilter(filter as FilterType);
  };

  const handleClearFilter = () => {
    setActiveFilter("all");
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-10 py-8 px-4">
        {/* Header with Manifesto */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light tracking-tight text-foreground/80" data-testid="text-dashboard-title">
            Asset Manager
          </h1>
          {/* Strategy Manifesto - MANDATORY */}
          <p className="text-sm text-muted-foreground/70 tracking-wide font-medium max-w-lg mx-auto leading-relaxed">
            Strong portfolios start with solid GROUND, are refined through SHAPE, and respond to market with FORCE.
          </p>
        </div>

        {/* Non-urgent Warning */}
        {data?.dataWarning ? (
          <div className="mx-auto max-w-2xl px-6 py-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
              {data.dataWarning.includes("API key") ? "Connecting to market data..." : data.dataWarning}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="py-20 text-center space-y-4">
            <h2 className="text-lg font-medium text-muted-foreground">Unable to reach the decision engine</h2>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-slate-400 hover:text-slate-600">
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : data ? (
          <div className="space-y-10">
            {/* Market Context Panel (Global) */}
            <MarketContextPanel data={data} onSummaryClick={handleSummaryClick} />

            {/* Filter Header (when filtered) */}
            {activeFilter !== "all" && (
              <div className="flex items-center justify-between p-5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-xl font-semibold">{FILTER_LABELS[activeFilter].title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{FILTER_LABELS[activeFilter].subtitle}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFilter} className="gap-2">
                  <X className="w-4 h-4" />
                  Back to Overview
                </Button>
              </div>
            )}

            {/* Stock Grid */}
            {filteredStocks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredStocks.slice(0, activeFilter === "all" ? 6 : 15).map((stock) => (
                  <StockCard key={stock.symbol} stock={stock} />
                ))}
              </div>
            ) : activeFilter !== "all" ? (
              <div className="py-16 text-center space-y-3">
                <p className="text-muted-foreground text-lg">No stocks meet this criteria right now.</p>
                <p className="text-sm text-muted-foreground/70">This is normal during cautious markets.</p>
                <Button variant="ghost" size="sm" onClick={handleClearFilter} className="mt-4">
                  Back to Overview
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Minimal Footnote */}
        <div className="pt-16 text-center">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] font-bold">
            Data provided by Decision Engine v4.0
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
