import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  BarChart3,
  Gauge,
  AlertTriangle,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  IndexState,
  BreadthData,
  SectorState,
  MarketContext,
  MarketContextSnapshot,
  TrendDirection,
} from "@shared/types/marketContext";

function RegimeBadge({ regime, confidence }: { regime: MarketContext["regime"]; confidence: string }) {
  const regimeConfig = {
    RISK_ON: {
      label: "Risk On",
      className: "bg-stock-eligible/20 text-stock-eligible border-stock-eligible/30",
      icon: TrendingUp,
    },
    RISK_OFF: {
      label: "Risk Off",
      className: "bg-stock-reject/20 text-stock-reject border-stock-reject/30",
      icon: TrendingDown,
    },
    NEUTRAL: {
      label: "Neutral",
      className: "bg-stock-watch/20 text-stock-watch border-stock-watch/30",
      icon: Minus,
    },
  };

  const config = regimeConfig[regime];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge className={`${config.className} border gap-1`} data-testid="badge-market-regime">
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </Badge>
      <span className="text-xs text-muted-foreground">({confidence} confidence)</span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === "UP") return <TrendingUp className="w-4 h-4 text-stock-eligible" />;
  if (trend === "DOWN") return <TrendingDown className="w-4 h-4 text-stock-reject" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function IndexCard({ index }: { index: IndexState }) {
  const isPositive = index.changePercent >= 0;
  
  return (
    <div className="p-3 rounded-lg bg-muted/50" data-testid={`card-index-${index.symbol.toLowerCase()}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{index.symbol}</span>
        <TrendIcon trend={index.trend} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">${index.price.toFixed(2)}</span>
        <span className={`text-xs ${isPositive ? "text-stock-eligible" : "text-stock-reject"}`}>
          {isPositive ? "+" : ""}{index.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <Badge 
          variant="outline" 
          className={`text-[10px] px-1.5 py-0 ${index.above200DMA ? "text-stock-eligible border-stock-eligible/30" : "text-stock-reject border-stock-reject/30"}`}
        >
          {index.above200DMA ? "Above" : "Below"} 200DMA
        </Badge>
      </div>
    </div>
  );
}

function BreadthSection({ breadth }: { breadth: BreadthData }) {
  const healthConfig = {
    STRONG: { color: "text-stock-eligible", bg: "bg-stock-eligible" },
    NEUTRAL: { color: "text-stock-watch", bg: "bg-stock-watch" },
    WEAK: { color: "text-stock-reject", bg: "bg-stock-reject" },
  };

  const config = healthConfig[breadth.health];

  return (
    <div className="space-y-3" data-testid="section-breadth">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Market Breadth</span>
        <Badge 
          variant="outline" 
          className={`${config.color} border-current/30`}
        >
          {breadth.health}
        </Badge>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Stocks Above 200DMA</span>
            <span className="font-medium">{breadth.pctAbove200DMA.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${config.bg} transition-all`} 
              style={{ width: `${Math.min(100, breadth.pctAbove200DMA)}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">A/D Ratio</span>
            <p className="font-medium">{breadth.advanceDeclineRatio.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">NH/NL Ratio</span>
            <p className="font-medium">{breadth.newHighsLowsRatio.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolatilitySection({ volatility }: { volatility: MarketContext["volatility"] }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50" data-testid="section-volatility">
      <Gauge className={`w-5 h-5 ${volatility.isElevated ? "text-stock-reject" : "text-stock-eligible"}`} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">VIX</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold">{volatility.vixLevel.toFixed(1)}</span>
            <TrendIcon trend={volatility.vixTrend} />
          </div>
        </div>
        {volatility.isElevated && (
          <div className="flex items-center gap-1 text-xs text-stock-reject mt-1">
            <AlertTriangle className="w-3 h-3" />
            Elevated volatility
          </div>
        )}
      </div>
    </div>
  );
}

function SectorHeatmap({ sectors }: { sectors: SectorState[] }) {
  const topSectors = sectors.slice(0, 4);
  const bottomSectors = sectors.slice(-3);

  return (
    <div className="space-y-3" data-testid="section-sectors">
      <span className="text-sm font-medium">Sector Leadership</span>
      <div className="space-y-2">
        <div>
          <span className="text-xs text-muted-foreground">Leading</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {topSectors.filter(s => s.trend === "LEADING").map(sector => (
              <Badge 
                key={sector.symbol} 
                variant="outline"
                className="text-stock-eligible border-stock-eligible/30 text-[10px]"
              >
                {sector.symbol} +{sector.relativeStrength.toFixed(1)}%
              </Badge>
            ))}
            {topSectors.filter(s => s.trend !== "LEADING").length === topSectors.length && (
              <span className="text-xs text-muted-foreground">No clear leaders</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Lagging</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {bottomSectors.filter(s => s.trend === "LAGGING").map(sector => (
              <Badge 
                key={sector.symbol} 
                variant="outline"
                className="text-stock-reject border-stock-reject/30 text-[10px]"
              >
                {sector.symbol} {sector.relativeStrength.toFixed(1)}%
              </Badge>
            ))}
            {bottomSectors.filter(s => s.trend !== "LAGGING").length === bottomSectors.length && (
              <span className="text-xs text-muted-foreground">No clear laggards</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getRegimeImplication(regime: MarketContext["regime"]): string {
  switch (regime) {
    case "RISK_ON":
      return "Both strategic and tactical positions favored. Trend following works well.";
    case "RISK_OFF":
      return "Tactical trades favored over strategic. Defensive positioning recommended.";
    default:
      return "Selectivity is key. Wait for clearer signals before committing.";
  }
}

function getIndexSummary(indices: MarketContext["indices"]): string {
  const aboveCount = [indices.spy, indices.qqq, indices.dia, indices.iwm].filter(i => i.above200DMA).length;
  if (aboveCount >= 3) return `${aboveCount}/4 major indices above 200DMA`;
  if (aboveCount >= 2) return `Only ${aboveCount}/4 indices above 200DMA`;
  return `${aboveCount}/4 indices above 200DMA - bearish structure`;
}

function getBreadthSummary(breadth: BreadthData): string {
  const pct = Math.round(breadth.pctAbove200DMA);
  if (pct >= 60) return `${pct}% of stocks in uptrends - healthy participation`;
  if (pct >= 40) return `${pct}% of stocks in uptrends - mixed breadth`;
  return `Only ${pct}% of stocks in uptrends - narrow leadership`;
}

function getVolatilitySummary(volatility: MarketContext["volatility"]): string {
  if (volatility.isElevated) return `VIX at ${volatility.vixLevel.toFixed(1)} - elevated fear, expect chop`;
  return `VIX at ${volatility.vixLevel.toFixed(1)} - calm conditions for trend trades`;
}

function RegimeExplainer({ context }: { context: MarketContext }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const regimeColors: Record<string, string> = {
    RISK_ON: "text-stock-eligible",
    RISK_OFF: "text-stock-reject",
    NEUTRAL: "text-stock-watch",
  };
  
  return (
    <div className="pt-3 border-t border-border/50" data-testid="section-regime-explainer">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left group"
        data-testid="button-regime-analysis"
      >
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          View regime analysis ({context.regimeReasons.length} factors)
        </span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )} 
        />
      </button>
      
      {isExpanded && (
        <div className="mt-3 space-y-3" data-testid="section-regime-details">
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium">
              Market is <span className={regimeColors[context.regime]}>{context.regime.replace("_", " ")}</span> because:
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <BarChart3 className="w-3 h-3 mt-0.5 shrink-0" />
                {getIndexSummary(context.indices)}
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-3 h-3 mt-0.5 shrink-0" />
                {getBreadthSummary(context.breadth)}
              </li>
              <li className="flex items-start gap-2">
                <Gauge className="w-3 h-3 mt-0.5 shrink-0" />
                {getVolatilitySummary(context.volatility)}
              </li>
            </ul>
          </div>
          
          <div className="p-3 rounded-lg border border-border/50">
            <p className="text-xs font-medium mb-1">Implication:</p>
            <p className="text-xs text-muted-foreground">
              {getRegimeImplication(context.regime)}
            </p>
          </div>
          
          {context.regimeReasons.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Raw Scoring Factors:</p>
              <ul className="space-y-0.5">
                {context.regimeReasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground/50">-</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarketContextSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-16" />
      </CardContent>
    </Card>
  );
}

export function MarketContextPanel() {
  const { data, isLoading, error, refetch } = useQuery<MarketContextSnapshot>({
    queryKey: ["/api/market-context"],
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <MarketContextSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-stock-watch mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Unable to load market context</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-market">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { context, meta } = data;

  return (
    <Card data-testid="card-market-context">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Market Context</CardTitle>
          </div>
          <RegimeBadge regime={context.regime} confidence={context.confidence} />
        </div>
        {meta.warnings.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-stock-watch mt-2">
            <AlertTriangle className="w-3 h-3" />
            {meta.warnings[0]}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <IndexCard index={context.indices.spy} />
          <IndexCard index={context.indices.qqq} />
          <IndexCard index={context.indices.dia} />
          <IndexCard index={context.indices.iwm} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BreadthSection breadth={context.breadth} />
          <div className="space-y-3">
            <VolatilitySection volatility={context.volatility} />
            <SectorHeatmap sectors={context.sectors} />
          </div>
        </div>

        <RegimeExplainer context={context} />
      </CardContent>
    </Card>
  );
}
