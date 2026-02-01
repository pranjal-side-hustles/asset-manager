import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
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

          <div className="flex items-center justify-between flex-wrap gap-2">
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
