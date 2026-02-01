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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/40">
          <CardContent className="p-8 flex flex-col items-center space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-10 w-28" />
            <div className="w-full pt-4 border-t border-border/30 flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
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

  if (!stocks.some(s => s.capitalPriority)) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">What You Can Do</h3>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-buy-count">{buyCount}</p>
            <p className="text-xs text-muted-foreground">Good to Act</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-accumulate-count">{accumulateCount}</p>
            <p className="text-xs text-muted-foreground">Add Gradually</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-pilot-count">{pilotCount}</p>
            <p className="text-xs text-muted-foreground">Small Look</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-500" data-testid="text-blocked-count">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">Pause</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStrategicSubtitle(avgScore: number, regime?: string): string {
  if (regime === "RISK_OFF") return "Market being cautious";
  if (regime === "RISK_ON") return "Good conditions for investing";
  if (avgScore >= 70) return "Strong companies overall";
  if (avgScore >= 50) return "Mixed picture, be selective";
  return "Patience is wise right now";
}

function getTacticalSubtitle(avgScore: number, regime?: string): string {
  if (regime === "RISK_OFF") return "Few good moments right now";
  if (regime === "RISK_ON") return "Several good opportunities";
  if (avgScore >= 70) return "Good timing conditions";
  if (avgScore >= 50) return "Some opportunities available";
  return "Better to wait";
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
            <p className="text-xs text-muted-foreground">Ready Now</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {eligibleCount > 0 ? "Good timing right now" : "None ready at the moment"}
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
            <p className="text-xs text-muted-foreground">Keep Watching</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {watchCount > 0 ? "Waiting for better moment" : "All stocks evaluated"}
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
            <p className="text-xs text-muted-foreground">Long-Term Score</p>
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
            <p className="text-xs text-muted-foreground">Timing Score</p>
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
              Your Stocks
            </h1>
            <p className="text-muted-foreground mt-1">
              See which stocks look strong and when the timing might be right
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

        {data?.dataWarning ? (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Market data unavailable</p>
                <p className="text-sm text-muted-foreground mt-1">{data.dataWarning}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()} data-testid="button-retry-warning">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        {error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-stock-reject mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to Load Data</h2>
              <p className="text-muted-foreground mb-2">
                Unable to fetch stock data. Please try again.
              </p>
              <p className="text-sm text-muted-foreground/80 font-mono mb-4 break-all">
                {error.message}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.stocks.slice(0, 6).map((stock) => (
                <StockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
