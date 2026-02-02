import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { StockCard } from "@/components/stock/StockCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { DashboardResponse } from "@shared/types";

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/30 bg-card/10">
          <CardContent className="p-6 flex flex-col items-center space-y-5">
            <div className="w-full flex justify-between">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-4 w-40" />
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
      <div className="max-w-5xl mx-auto space-y-10 py-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.stocks.slice(0, 6).map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
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
