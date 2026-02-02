import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { DashboardStock } from "@shared/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StockCardProps {
  stock: DashboardStock;
}

function getDecisionColor(label?: string): { text: string; border: string; bg: string } {
  switch (label) {
    case "GOOD_TO_ACT":
      return { text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-500/40", bg: "bg-emerald-100/50 dark:bg-emerald-500/20" };
    case "WORTH_A_SMALL_LOOK":
      return { text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-500/40", bg: "bg-blue-100/50 dark:bg-blue-500/20" };
    case "PAUSE":
      return { text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-500/40", bg: "bg-amber-100/50 dark:bg-amber-500/20" };
    default: // KEEP_AN_EYE_ON
      return { text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-500/40", bg: "bg-slate-100/50 dark:bg-slate-500/20" };
  }
}

function getMarketContextColor(label?: string): string {
  switch (label) {
    case "Supportive":
      return "bg-emerald-100/60 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400";
    case "Mixed":
      return "bg-blue-100/60 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400";
    case "Cautious":
    case "Risk-Off":
      return "bg-amber-100/60 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400";
    default:
      return "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400";
  }
}

function getMarketContextTooltip(label?: string): string {
  switch (label) {
    case "Supportive":
      return "Market conditions broadly support risk-taking.";
    case "Mixed":
      return "Market conditions are uneven and selective.";
    case "Cautious":
    case "Risk-Off":
      return "Market conditions are defensive; patience is favored.";
    default:
      return "Market conditions are being evaluated.";
  }
}

export function StockCard({ stock }: StockCardProps) {
  const decisionColor = getDecisionColor(stock.decisionLabel?.label);
  const marketLabel = stock.marketContext?.label || "Mixed";

  return (
    <Link href={`/stocks/${stock.symbol.toUpperCase()}`}>
      <Card
        className="hover:shadow-lg cursor-pointer transition-all duration-300 overflow-hidden border-border/40 bg-card/50 backdrop-blur-md h-full flex flex-col"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-6 space-y-5 flex-1 flex flex-col">
          {/* 1. Stock Identity */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-2xl font-bold tracking-tight text-foreground/90">{stock.symbol}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate max-w-[140px]">
                {stock.companyName}
              </p>
            </div>

            {/* 2. Price */}
            <div className="text-right">
              <div className="text-lg font-bold text-foreground/70">${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="text-[9px] text-muted-foreground/60 uppercase tracking-tighter font-medium">Last market close</div>
            </div>
          </div>

          {/* 3. Market Context Badge */}
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider cursor-help",
                  getMarketContextColor(marketLabel)
                )}>
                  Market: {marketLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-center">
                <p className="text-xs">{getMarketContextTooltip(marketLabel)}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* 4. Decision Status (PRIMARY) */}
          <div className={cn(
            "px-4 py-4 rounded-xl border text-center space-y-1.5 flex-1 flex flex-col justify-center",
            decisionColor.bg, decisionColor.border, decisionColor.text
          )}>
            <div className="text-base font-bold uppercase tracking-wide">
              {stock.decisionLabel?.displayText || "Keep an Eye On"}
            </div>
          </div>

          {/* 5. One-line Reason */}
          <p className="text-[11px] text-center text-muted-foreground font-medium leading-relaxed">
            {stock.decisionLabel?.explanation || "Conditions are developing"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
