import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { StockCard } from "@/components/stock/StockCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@shared/types";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/30 bg-card/10">
          <CardContent className="p-8 flex flex-col items-center space-y-6">
            <div className="w-full flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex-1 flex flex-col items-center space-y-3 py-10">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="w-full pt-4 border-t border-border/10 flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-2 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}



export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery<DashboardResponse>({
    queryKey: ["/api/dashboard"],
  });

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-12 py-8">
        {/* Calm Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light tracking-tight text-foreground/80" data-testid="text-dashboard-title">
            Asset Manager
          </h1>
          <p className="text-sm text-muted-foreground/60 tracking-wide font-medium">
            Objective analysis for intentional decisions
          </p>
        </div>

        {/* Minimal Market Context info */}
        {data && !data.dataWarning && (
          <div className="flex justify-center">
            <div className="px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
              <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
                Market Status: {data.marketContext?.label || (data.marketRegime === 'RISK_ON' ? 'Supportive' : data.marketRegime === 'RISK_OFF' ? 'Cautious' : 'Mixed')}
              </span>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <span className="text-[11px] font-medium text-slate-400 tracking-wider uppercase">
                Last Update: {new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {data.stocks.slice(0, 6).map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        ) : null}

        {/* Minimal Footnote */}
        <div className="pt-20 text-center">
          <p className="text-[10px] text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] font-bold">
            Data provided by Decision Engine v4.0
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
