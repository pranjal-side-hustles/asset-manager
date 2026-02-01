import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { StockCard } from "@/components/stock/StockCard";
import { MarketContextPanel } from "@/components/market";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, Shield, AlertCircle, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@shared/types";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface StatsCardsProps {
  stocks: DashboardResponse["stocks"];
  marketRegime?: DashboardResponse["marketRegime"];
}

interface CapitalActionsProps {
  stocks: DashboardResponse["stocks"];
}

function CapitalActionsCard({ stocks }: CapitalActionsProps) {
  const buyCount = stocks.filter(s => s.capitalPriority === "BUY").length;
  const accumulateCount = stocks.filter(s => s.capitalPriority === "ACCUMULATE").length;
  const pilotCount = stocks.filter(s => s.capitalPriority === "PILOT").length;
  const blockedCount = stocks.filter(s => s.capitalPriority === "BLOCKED").length;
  
  // Only show if we have Phase 2 data
  if (!stocks.some(s => s.capitalPriority)) return null;
  
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Capital Actions</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-buy-count">{buyCount}</p>
            <p className="text-xs text-muted-foreground">BUY</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-accumulate-count">{accumulateCount}</p>
            <p className="text-xs text-muted-foreground">ACCUMULATE</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-pilot-count">{pilotCount}</p>
            <p className="text-xs text-muted-foreground">PILOT</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-500" data-testid="text-blocked-count">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">BLOCKED</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStrategicSubtitle(avgScore: number, regime?: string): string {
  if (regime === "RISK_OFF") return "Cautious market environment";
  if (regime === "RISK_ON") return "Favorable conditions for positions";
  if (avgScore >= 70) return "Strong setup across universe";
  if (avgScore >= 50) return "Mixed signals, selectivity key";
  return "Patience recommended";
}

function getTacticalSubtitle(avgScore: number, regime?: string): string {
  if (regime === "RISK_OFF") return "Limited short-term setups";
  if (regime === "RISK_ON") return "Multiple momentum opportunities";
  if (avgScore >= 70) return "Active trading environment";
  if (avgScore >= 50) return "Selective opportunities available";
  return "Few clean entries";
}

function StatsCards({ stocks, marketRegime }: StatsCardsProps) {
  const eligibleCount = stocks.filter(
    (s) => s.strategicStatus === "ELIGIBLE" || s.tacticalStatus === "TRADE"
  ).length;
  const watchCount = stocks.filter(
    (s) => s.strategicStatus === "WATCH" || s.tacticalStatus === "WATCH"
  ).length;
  const avgStrategicScore = Math.round(
    stocks.reduce((sum, s) => sum + s.strategicScore, 0) / stocks.length
  );
  const avgTacticalScore = Math.round(
    stocks.reduce((sum, s) => sum + s.tacticalScore, 0) / stocks.length
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stock-eligible/10">
            <TrendingUp className="w-5 h-5 text-stock-eligible" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-eligible-count">{eligibleCount}</p>
            <p className="text-xs text-muted-foreground">Trade Eligible</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {eligibleCount > 0 ? "Short-term momentum setups" : "No setups currently"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stock-watch/10">
            <AlertCircle className="w-5 h-5 text-stock-watch" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-watch-count">{watchCount}</p>
            <p className="text-xs text-muted-foreground">On Watch</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {watchCount > 0 ? "Waiting for confirmation" : "All stocks decided"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-strategic-avg">{avgStrategicScore}</p>
            <p className="text-xs text-muted-foreground">Avg Strategic</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {getStrategicSubtitle(avgStrategicScore, marketRegime)}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-chart-4/10">
            <Shield className="w-5 h-5 text-chart-4" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid="text-tactical-avg">{avgTacticalScore}</p>
            <p className="text-xs text-muted-foreground">Avg Tactical</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {getTacticalSubtitle(avgTacticalScore, marketRegime)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery<DashboardResponse>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">
              Stock Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Evaluate stocks across strategic and tactical trading horizons
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Last updated:{" "}
                {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-stock-reject mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
              <p className="text-muted-foreground mb-4">
                Unable to fetch stock data. Please try again.
              </p>
              <Button onClick={() => refetch()} data-testid="button-retry">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <DashboardSkeleton />
          </>
        ) : data ? (
          <>
            <MarketContextPanel />
            <StatsCards stocks={data.stocks} marketRegime={data.marketRegime} />
            <CapitalActionsCard stocks={data.stocks} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.stocks.map((stock) => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
