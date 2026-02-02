import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { StockHeader } from "@/components/stock/StockHeader";
import { StrategicGrowthPanel, TacticalSentinelPanel } from "@/components/stock/HorizonPanel";
import { ConfidenceIndicator } from "@/components/stock/ConfidenceIndicator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { StockEvaluationResponse } from "@shared/types";

function StockDeepDiveSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <div className="flex gap-6 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-36 w-36 rounded-full mx-auto" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-36 w-36 rounded-full mx-auto" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getDecisionColor(label?: string): { text: string; border: string; bg: string } {
  switch (label) {
    case "GOOD_TO_ACT":
      return { text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/40", bg: "bg-emerald-100/50 dark:bg-emerald-500/20" };
    case "WORTH_A_SMALL_LOOK":
      return { text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-500/40", bg: "bg-blue-100/50 dark:bg-blue-500/20" };
    case "PAUSE":
      return { text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/40", bg: "bg-amber-100/50 dark:bg-amber-500/20" };
    default:
      return { text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-500/40", bg: "bg-slate-100/50 dark:bg-slate-500/20" };
  }
}

export default function StockDeepDive() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase() || "";

  const { data, isLoading, error, refetch } = useQuery<StockEvaluationResponse>({
    queryKey: ["/api/stocks", symbol],
    enabled: !!symbol,
  });

  const marketRegime = data?.marketRegime;

  return (
    <MainLayout>
      {error ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-stock-reject mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Stock Not Found</h2>
              <p className="text-muted-foreground mb-6">
                Unable to find data for symbol "{symbol}". Please check the symbol and try again.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" asChild data-testid="button-back">
                  <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Button onClick={() => refetch()} data-testid="button-retry">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : isLoading ? (
        <StockDeepDiveSkeleton />
      ) : data ? (
        <div className="space-y-8">
          <StockHeader
            stock={data.stock}
            quote={data.quote}
            dataConfidence={data.dataConfidence}
            warnings={data.warnings}
            providersUsed={data.providersUsed}
          />

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                Evaluated at{" "}
                {new Date(data.evaluation.evaluatedAt).toLocaleString()}
              </span>
            </div>
            {data.dataConfidence && (
              <ConfidenceIndicator
                confidence={data.dataConfidence}
                reasons={data.confidenceReasons}
              />
            )}
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Decision Summary Banner */}
            {data.decisionLabel && (
              <div className={cn(
                "px-6 py-4 rounded-xl border text-center space-y-1 transition-all",
                getDecisionColor(data.decisionLabel.label).bg,
                getDecisionColor(data.decisionLabel.label).border,
                getDecisionColor(data.decisionLabel.label).text
              )}>
                <div className="text-lg font-bold uppercase tracking-wider">{data.decisionLabel.displayText}</div>
                <p className="text-sm font-medium opacity-80">{data.decisionLabel.explanation}</p>
              </div>
            )}

            {/* Passive Market Context Section */}
            {data.marketContext && (
              <div className="px-6 py-4 rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/10 transition-all text-center">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Market Context</div>
                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Market: {data.marketContext.label}
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  {data.marketContext.description}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrategicGrowthPanel
              evaluation={data.evaluation.strategicGrowth}
              marketRegime={marketRegime}
            />
            <TacticalSentinelPanel
              evaluation={data.evaluation.tacticalSentinel}
              marketRegime={marketRegime}
            />
          </div>
        </div>
      ) : null}
    </MainLayout>
  );
}
