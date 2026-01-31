import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { ScoreCircle } from "./ScoreCircle";
import { StatusBadge } from "./StatusBadge";
import type { DashboardStock } from "@shared/types";

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
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {stock.companyName}
              </p>
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

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Strategic</span>
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Tactical</span>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
