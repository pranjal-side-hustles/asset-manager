import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Target, Clock, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { ScoreCircle } from "./ScoreCircle";
import { StatusBadge } from "./StatusBadge";
import { CapitalPriorityBadge } from "./CapitalPriorityBadge";
import { Phase2Explainer } from "./Phase2Explainer";
import { Badge } from "@/components/ui/badge";
import type { DashboardStock } from "@shared/types";

function getHorizonLabelStyle(label?: string) {
  if (!label) return { color: "text-muted-foreground", icon: null };
  
  if (label.includes("High Conviction + Actionable")) {
    return { color: "text-stock-eligible", icon: Target };
  }
  if (label.includes("Strong Business")) {
    return { color: "text-stock-eligible/70", icon: Clock };
  }
  if (label.includes("Short-Term Opportunity")) {
    return { color: "text-stock-watch", icon: BarChart3 };
  }
  if (label.includes("Developing")) {
    return { color: "text-muted-foreground", icon: Clock };
  }
  return { color: "text-stock-reject/70", icon: AlertTriangle };
}

interface StockCardProps {
  stock: DashboardStock;
}

export function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.change >= 0;

  return (
    <Link href={`/stocks/${stock.symbol}`}>
      <Card
        className="hover-elevate cursor-pointer transition-all duration-200 group overflow-visible"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" data-testid={`text-symbol-${stock.symbol.toLowerCase()}`}>
                  {stock.symbol}
                </h3>
                {stock.capitalPriority && (
                  <CapitalPriorityBadge priority={stock.capitalPriority} />
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {stock.companyName}
              </p>
              {stock.sector && stock.sector !== "Unknown" && (
                <p className="text-xs text-muted-foreground/70">
                  {stock.sector}
                  {stock.sectorRegime && (
                    <span className={cn(
                      "ml-1",
                      stock.sectorRegime === "FAVORED" ? "text-stock-eligible" :
                      stock.sectorRegime === "AVOID" ? "text-stock-reject" :
                      "text-stock-watch"
                    )}>
                      ({stock.sectorRegime})
                    </span>
                  )}
                </p>
              )}
              {stock.portfolioAction && stock.portfolioAction !== "ALLOW" && (
                <p className="text-xs text-stock-watch">
                  Portfolio: {stock.portfolioAction}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                ${stock.price.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div
                className={cn(
                  "flex items-center justify-end gap-1 text-xs font-medium",
                  isPositive ? "text-stock-positive" : "text-stock-negative"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {stock.horizonLabel && (
            <div className="flex items-center gap-1.5 mb-3" data-testid={`horizon-label-container-${stock.symbol.toLowerCase()}`}>
              {(() => {
                const { color, icon: Icon } = getHorizonLabelStyle(stock.horizonLabel);
                return (
                  <>
                    {Icon && <Icon className={cn("w-3.5 h-3.5", color)} />}
                    <span className={cn("text-xs font-medium", color)} data-testid={`text-horizon-label-${stock.symbol.toLowerCase()}`}>
                      {stock.horizonLabel}
                    </span>
                  </>
                );
              })()}
              {stock.integrityFlags && stock.integrityFlags.length > 0 && (
                <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-5 border-stock-watch text-stock-watch" data-testid={`badge-event-flag-${stock.symbol.toLowerCase()}`}>
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  Event
                </Badge>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Strategic (WHY)</span>
                <StatusBadge
                  status={stock.strategicStatus}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <ScoreCircle score={stock.strategicScore} size="sm" />
                <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stock.strategicScore >= 70
                        ? "bg-stock-eligible"
                        : stock.strategicScore >= 40
                        ? "bg-stock-watch"
                        : "bg-stock-reject"
                    )}
                    style={{ width: `${stock.strategicScore}%` }}
                  />
                </div>
              </div>
              {stock.strategicLabels && (
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    Conviction: {stock.strategicLabels.fundamentalConviction}
                  </Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tactical (WHEN)</span>
                <StatusBadge
                  status={stock.tacticalStatus}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <ScoreCircle score={stock.tacticalScore} size="sm" />
                <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      stock.tacticalScore >= 70
                        ? "bg-stock-eligible"
                        : stock.tacticalScore >= 40
                        ? "bg-stock-watch"
                        : "bg-stock-reject"
                    )}
                    style={{ width: `${stock.tacticalScore}%` }}
                  />
                </div>
              </div>
              {stock.tacticalLabels && (
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    Setup: {stock.tacticalLabels.technicalSetup}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {stock.capitalPriority && (
            <Phase2Explainer
              capitalPriority={stock.capitalPriority}
              sector={stock.sector}
              sectorRegime={stock.sectorRegime}
              portfolioAction={stock.portfolioAction}
              rankInSector={stock.rankInSector}
              reasons={stock.phase2Reasons}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
