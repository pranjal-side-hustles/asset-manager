import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { ChevronDown, Check, X } from "lucide-react";
import { useState } from "react";
import type { DashboardStock } from "@shared/types";

interface StockCardProps {
  stock: DashboardStock;
}

// Semantic color mapping for decision labels
function getDecisionBannerStyle(label?: string) {
  if (!label) return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" };

  if (label === "GOOD_TO_ACT" || label.includes("Good to Act")) {
    return { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" };
  }
  if (label === "KEEP_AN_EYE_ON" || label.includes("Keep an Eye") || label.includes("Worth a Small Look")) {
    return { bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" };
  }
  if (label === "PAUSE" || label.includes("Pause")) {
    return { bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" };
  }
  return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" };
}

// Semantic color mapping for scores
function getScoreStyle(score: number) {
  if (score >= 65) {
    return { border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  }
  if (score >= 50) {
    return { border: "border-blue-300 dark:border-blue-700", text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" };
  }
  return { border: "border-amber-300 dark:border-amber-700", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" };
}

// Derive signal explanations from stock data
function getBusinessQualitySignals(stock: DashboardStock) {
  const signals: { label: string; positive: boolean }[] = [];

  // Derive from strategic labels if available
  if (stock.strategicLabels?.fundamentalConviction === "High") {
    signals.push({ label: "Strong fundamental conviction", positive: true });
  } else if (stock.strategicLabels?.fundamentalConviction === "Low") {
    signals.push({ label: "Weak fundamental conviction", positive: false });
  }

  if (stock.strategicLabels?.technicalAlignment === "Confirming") {
    signals.push({ label: "Technical structure is confirming", positive: true });
  } else if (stock.strategicLabels?.technicalAlignment === "Weak") {
    signals.push({ label: "Technical structure is weak", positive: false });
  }

  // Fallback based on score
  if (signals.length === 0) {
    if (stock.strategicScore >= 65) {
      signals.push({ label: "Business fundamentals are solid", positive: true });
      signals.push({ label: "Consistent performance track record", positive: true });
    } else if (stock.strategicScore >= 50) {
      signals.push({ label: "Business fundamentals are developing", positive: true });
      signals.push({ label: "Some areas need monitoring", positive: false });
    } else {
      signals.push({ label: "Fundamentals need improvement", positive: false });
      signals.push({ label: "Elevated risk factors present", positive: false });
    }
  }

  return signals;
}

function getMarketTimingSignals(stock: DashboardStock) {
  const signals: { label: string; positive: boolean }[] = [];

  // Derive from tactical labels if available
  if (stock.tacticalLabels?.technicalSetup === "Strong") {
    signals.push({ label: "Technical setup is favorable", positive: true });
  } else if (stock.tacticalLabels?.technicalSetup === "Weak") {
    signals.push({ label: "Technical setup is unfavorable", positive: false });
  }

  // Market regime
  if (stock.marketRegime === "RISK_ON") {
    signals.push({ label: "Market conditions are supportive", positive: true });
  } else if (stock.marketRegime === "RISK_OFF") {
    signals.push({ label: "Market conditions are challenging", positive: false });
  } else {
    signals.push({ label: "Market conditions are mixed", positive: true });
  }

  // Sector regime
  if (stock.sectorRegime === "FAVORED") {
    signals.push({ label: "Sector is currently favored", positive: true });
  } else if (stock.sectorRegime === "AVOID") {
    signals.push({ label: "Sector is currently weak", positive: false });
  }

  // Fallback based on score
  if (signals.length < 2) {
    if (stock.tacticalScore >= 65) {
      signals.push({ label: "Timing conditions are good", positive: true });
    } else if (stock.tacticalScore >= 50) {
      signals.push({ label: "Wait for better entry point", positive: false });
    } else {
      signals.push({ label: "Timing is not favorable", positive: false });
    }
  }

  return signals;
}

interface ScoreCardProps {
  label: string;
  description: string;
  score: number;
  signals: { label: string; positive: boolean }[];
  expandable?: boolean;
}

function ScoreCard({ label, description, score, signals, expandable = false }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  const style = getScoreStyle(score);

  return (
    <div className={cn("rounded-lg border-2 p-3 transition-all", style.border, style.bg)}>
      <div
        className={cn("flex items-center justify-between", expandable && "cursor-pointer")}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground/80">{label}</span>
            {expandable && (
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            )}
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{description}</p>
        </div>
        <div className={cn("text-2xl font-bold", style.text)}>{score}</div>
      </div>

      {expandable && expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
          {signals.map((signal, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              {signal.positive ? (
                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <X className="w-3 h-3 text-amber-500 shrink-0" />
              )}
              <span className="text-muted-foreground">{signal.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StockCard({ stock }: StockCardProps) {
  const priceAvailable = stock.priceAvailable;
  const decisionStyle = getDecisionBannerStyle(stock.decisionLabel?.label || stock.decisionLabel?.displayText);

  const businessSignals = getBusinessQualitySignals(stock);
  const timingSignals = getMarketTimingSignals(stock);

  return (
    <Link href={`/stocks/${stock.symbol.toUpperCase()}`}>
      <Card
        className="hover:translate-y-[-2px] hover:shadow-lg cursor-pointer transition-all duration-300 group overflow-hidden h-full border-border/40"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-5 h-full flex flex-col">
          {/* Header: Identity & Price */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground tracking-tight" data-testid={`text-symbol-${stock.symbol.toLowerCase()}`}>
                {stock.symbol}
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium line-clamp-1">
                {stock.companyName}
              </p>
            </div>
            {priceAvailable && (
              <div className="text-right">
                <div className="text-base font-semibold text-foreground/80" data-testid={`text-price-${stock.symbol.toLowerCase()}`}>
                  ${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[8px] text-muted-foreground uppercase tracking-widest">Last close</div>
              </div>
            )}
          </div>

          {/* Decision Banner with Semantic Color */}
          <div className={cn("rounded-lg px-4 py-3 mb-4 border", decisionStyle.bg, decisionStyle.border)}>
            <h2 className={cn("text-lg font-bold tracking-tight text-center", decisionStyle.text)} data-testid={`text-decision-label-${stock.symbol.toLowerCase()}`}>
              {stock.decisionLabel?.displayText || "Keep an Eye On"}
            </h2>
            <p className="text-[10px] text-center text-muted-foreground mt-1 leading-relaxed">
              {stock.decisionLabel?.explanation || "Conditions are developing"}
            </p>
          </div>

          {/* Score Cards */}
          <div className="space-y-3 flex-1">
            <ScoreCard
              label="Business Quality"
              description="Measures the strength and durability of the business."
              score={stock.strategicScore}
              signals={businessSignals}
              expandable={true}
            />
            <ScoreCard
              label="Market Timing"
              description="Measures whether current market conditions favor action."
              score={stock.tacticalScore}
              signals={timingSignals}
              expandable={true}
            />
          </div>

          {/* Market Context Badge */}
          <div className="mt-4 pt-3 border-t border-border/30 flex justify-center">
            <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">
                Market: {stock.marketRegime === 'RISK_ON' ? 'Supportive' : stock.marketRegime === 'RISK_OFF' ? 'Risk-Off' : 'Mixed'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
