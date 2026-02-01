import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight, Clock, Target, BarChart3, Info } from "lucide-react";
import { Link } from "wouter";
import { StatusBadge } from "./StatusBadge";
import type { DashboardStock } from "@shared/types";

const horizonLabelMapping: Record<string, string> = {
  "High Conviction + Actionable": "High Confidence Setup",
  "Strong Business – Wait for Setup": "Strong Business, Watching Timing",
  "Short-Term Opportunity Only": "Short-Term Play Only",
  "Developing – Monitor Both": "Developing Situation",
  "Not Actionable": "Wait for Confirmation",
};

function getPlainLabel(label?: string): string {
  if (!label) return "";
  for (const [key, value] of Object.entries(horizonLabelMapping)) {
    if (label.includes(key)) return value;
  }
  return label;
}

function getHorizonLabelStyle(label?: string) {
  // We want a neutral, passive feel.
  if (!label) return { color: "text-muted-foreground", icon: null, bg: "bg-muted/10" };

  if (label.includes("High Conviction + Actionable") || label.includes("Strong & Ready")) {
    return { color: "text-primary", icon: Target, bg: "bg-primary/5" };
  }
  if (label.includes("Strong Business") || label.includes("Watching Timing")) {
    return { color: "text-blue-500", icon: Clock, bg: "bg-blue-500/5" };
  }
  if (label.includes("Short-Term Opportunity") || label.includes("Short-Term Play")) {
    return { color: "text-emerald-500", icon: BarChart3, bg: "bg-emerald-500/5" };
  }
  return { color: "text-muted-foreground", icon: Info, bg: "bg-muted/10" };
}

interface StockCardProps {
  stock: DashboardStock;
}

export function StockCard({ stock }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const priceAvailable = stock.priceAvailable;
  const { color, icon: Icon, bg } = getHorizonLabelStyle(stock.horizonLabel);

  return (
    <Link href={`/stocks/${stock.symbol}`}>
      <Card
        className="hover:translate-y-[-2px] hover:shadow-md cursor-pointer transition-all duration-300 group overflow-hidden h-full border-border/40"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-6 h-full flex flex-col items-center text-center">
          {/* Header Area */}
          <div className="mb-4">
            <h3 className="text-2xl font-bold tracking-tight mb-1" data-testid={`text-symbol-${stock.symbol.toLowerCase()}`}>
              {stock.symbol}
            </h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              {stock.companyName}
            </p>
          </div>

          {/* Meaningful Status Section */}
          <div className={cn("w-full py-3 px-4 rounded-xl mb-6 flex flex-col items-center gap-2", bg)}>
            <div className="flex items-center gap-2">
              {Icon && <Icon className={cn("w-4 h-4", color)} />}
              <span className={cn("text-sm font-semibold", color)} data-testid={`text-horizon-label-${stock.symbol.toLowerCase()}`}>
                {getPlainLabel(stock.horizonLabel) || "Evaluation Pending"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Suggested approach given current conditions
            </p>
          </div>

          {/* Price Area */}
          <div className="mb-6 flex flex-col items-center">
            {priceAvailable ? (
              <>
                <div className="text-3xl font-bold mb-1" data-testid={`text-price-${stock.symbol.toLowerCase()}`}>
                  ${stock.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium",
                    isPositive ? "text-stock-positive" : "text-stock-negative"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground py-4">
                <span className="text-sm font-medium">Price Unavailable</span>
              </div>
            )}
          </div>

          {/* Subtle Indicators (The "Neat" part) */}
          <div className="mt-auto w-full pt-4 border-t border-border/30 flex justify-between items-center px-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {stock.sector || "General"}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={stock.tacticalStatus === "TRADE" ? "TRADE" : (stock.strategicStatus === "ELIGIBLE" ? "ELIGIBLE" : "WATCH")}
                size="sm"
              />
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
