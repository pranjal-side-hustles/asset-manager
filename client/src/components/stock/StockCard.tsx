import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Info } from "lucide-react";
import type { DashboardStock } from "@shared/types";

interface StockCardProps {
  stock: DashboardStock;
}

// Score color based on value
function getScoreColor(score: number): { text: string; bg: string } {
  if (score >= 70) {
    return { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-500/20" };
  }
  if (score >= 50) {
    return { text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-500/20" };
  }
  return { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-500/20" };
}

// Decision pill color (semantic)
function getDecisionPillColor(label?: string): { text: string; bg: string; border: string } {
  switch (label) {
    case "GOOD_TO_ACT":
      return { text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100/60 dark:bg-emerald-500/20", border: "border-emerald-200 dark:border-emerald-500/30" };
    case "WORTH_A_SMALL_LOOK":
      return { text: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100/60 dark:bg-blue-500/20", border: "border-blue-200 dark:border-blue-500/30" };
    case "PAUSE":
      return { text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100/60 dark:bg-amber-500/20", border: "border-amber-200 dark:border-amber-500/30" };
    default: // KEEP_AN_EYE_ON
      return { text: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100/60 dark:bg-slate-500/20", border: "border-slate-200 dark:border-slate-500/30" };
  }
}

// Get reason text for why this decision
function getDecisionReason(stock: DashboardStock): string {
  const reasons: string[] = [];

  if (stock.marketRegime === "RISK_OFF") {
    reasons.push("Market regime is cautious");
  }
  if (stock.portfolioAction === "BLOCK" || stock.portfolioAction === "REDUCE") {
    reasons.push("Portfolio guardrail triggered");
  }
  if (stock.sectorRegime === "AVOID") {
    reasons.push("Sector is out of favor");
  }
  if (stock.tacticalScore < 50) {
    reasons.push("FORCE momentum is weak");
  }
  if (stock.strategicScore < 50) {
    reasons.push("SHAPE structure needs improvement");
  }
  if (stock.tacticalScore >= 65 && stock.strategicScore >= 55 && stock.decisionLabel?.label !== "GOOD_TO_ACT") {
    reasons.push("Waiting for confirmation signals");
  }

  return reasons.length > 0 ? reasons[0] : "Conditions are developing";
}

export function StockCard({ stock }: StockCardProps) {
  const shapeColor = getScoreColor(stock.strategicScore);
  const forceColor = getScoreColor(stock.tacticalScore);
  const decisionPill = getDecisionPillColor(stock.decisionLabel?.label);
  const decisionReason = getDecisionReason(stock);

  return (
    <Link href={`/stocks/${stock.symbol.toUpperCase()}`}>
      <Card
        className="hover:shadow-lg cursor-pointer transition-all duration-300 overflow-hidden border-border/40 bg-card h-full flex flex-col"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
          {/* Row 0: Stock Identity & Price */}
          <div className="flex justify-between items-start">
            <div className="space-y-0.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground/90">{stock.symbol}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate max-w-[130px]">
                {stock.companyName}
              </p>
            </div>
            <div className="text-right">
              {stock.priceAvailable && stock.price > 0 ? (
                <>
                  <div className="text-base font-semibold text-foreground/70">
                    ${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 leading-tight">
                    {stock.priceLabel || "Last Market Close"}
                  </div>
                  <div className={cn(
                    "text-[10px] font-medium mt-0.5",
                    stock.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </div>
                </>
              ) : (
                <div className="text-xs font-medium text-muted-foreground italic mt-2">
                  Price unavailable (EOD)
                </div>
              )}
            </div>
          </div>

          {/* Row 1: SHAPE and FORCE Scores (Circular) */}
          <div className="grid grid-cols-2 gap-3">
            {/* SHAPE Score */}
            <div className="flex justify-center">
              <div className={cn(
                "w-24 h-24 rounded-full flex flex-col items-center justify-center",
                shapeColor.bg
              )}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">SHAPE</div>
                <div className={cn("text-2xl font-bold", shapeColor.text)}>{stock.strategicScore}</div>
                <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                  {stock.strategicScore >= 70 ? "Strong" : stock.strategicScore >= 50 ? "Neutral" : "Weak"}
                </div>
              </div>
            </div>

            {/* FORCE Score */}
            <div className="flex justify-center">
              <div className={cn(
                "w-24 h-24 rounded-full flex flex-col items-center justify-center",
                forceColor.bg
              )}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">FORCE</div>
                <div className={cn("text-2xl font-bold", forceColor.text)}>{stock.tacticalScore}</div>
                <div className="text-[9px] text-muted-foreground/70 mt-0.5">
                  {stock.tacticalScore >= 70 ? "Strong" : stock.tacticalScore >= 50 ? "Neutral" : "Weak"}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Decision State as Small Centered Pill */}
          <div className="flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold",
                    decisionPill.bg, decisionPill.border, decisionPill.text
                  )}>
                    <span>{stock.decisionLabel?.displayText || "Keep an Eye On"}</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs font-medium">Why this decision?</p>
                  <p className="text-xs text-muted-foreground mt-1">{decisionReason}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Row 3: One-line Explanation */}
          <p className="text-[11px] text-center text-muted-foreground font-medium leading-relaxed flex-1 flex items-center justify-center">
            {stock.decisionLabel?.explanation || "Conditions are developing"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
