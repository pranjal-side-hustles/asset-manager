import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { Check, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { DashboardStock } from "@shared/types";

interface StockCardProps {
  stock: DashboardStock;
}

function getScoreColor(score: number): { text: string; border: string; bg: string } {
  if (score >= 65) return { text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (score >= 50) return { text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/30", bg: "bg-blue-50 dark:bg-blue-500/10" };
  return { text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/30", bg: "bg-amber-50 dark:bg-amber-500/10" };
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

function SignalRow({ label, status }: { label: string; status: "pass" | "caution" | "fail" }) {
  const Icon = status === "pass" ? Check : status === "fail" ? X : AlertCircle;
  const color = status === "pass" ? "text-emerald-500" : status === "fail" ? "text-amber-500" : "text-blue-500";

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Icon className={cn("w-3.5 h-3.5", color)} />
    </div>
  );
}

export function StockCard({ stock }: StockCardProps) {
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showTimingDetails, setShowTimingDetails] = useState(false);

  const bqColor = getScoreColor(stock.strategicScore);
  const mtColor = getScoreColor(stock.tacticalScore);
  const decisionColor = getDecisionColor(stock.decisionLabel?.label);

  return (
    <Link href={`/stocks/${stock.symbol.toUpperCase()}`}>
      <Card
        className="hover:shadow-lg cursor-pointer transition-all duration-300 overflow-hidden border-border/40 bg-card/50 backdrop-blur-md h-full flex flex-col"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-6 space-y-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground/90">{stock.symbol}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold truncate max-w-[150px]">
                {stock.companyName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground/80">${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-tighter font-bold">Last Market Close</div>
            </div>
          </div>

          {/* Decision Banner (Main Message) */}
          <div className={cn("px-4 py-3 rounded-xl border text-center space-y-1 transition-colors duration-500", decisionColor.bg, decisionColor.border, decisionColor.text)}>
            <div className="text-sm font-bold uppercase tracking-wide">{stock.decisionLabel?.displayText || "Keep an Eye On"}</div>
            <p className="text-[11px] font-medium opacity-80">{stock.decisionLabel?.explanation || "Conditions are developing positively"}</p>
          </div>

          <div className="space-y-4 flex-1">
            {/* Business Quality Score Card */}
            <div className="space-y-2">
              <div
                className={cn("p-3 rounded-lg border transition-all", bqColor.bg, bqColor.border)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBusinessDetails(!showBusinessDetails); }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Business Quality</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-lg font-extrabold", bqColor.text)}>{stock.strategicScore}</span>
                    {showBusinessDetails ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight font-medium">Measures the strength and durability of the business.</p>

                {showBusinessDetails && stock.businessQualitySignals && (
                  <div className="mt-3 pt-3 border-t border-border/10 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <SignalRow label="Fundamentals" status={stock.businessQualitySignals.fundamentals} />
                    <SignalRow label="Institutional Flow" status={stock.businessQualitySignals.institutional} />
                    <SignalRow label="Macro Alignment" status={stock.businessQualitySignals.macro} />
                  </div>
                )}
              </div>
            </div>

            {/* Market Timing Score Card */}
            <div className="space-y-2">
              <div
                className={cn("p-3 rounded-lg border transition-all", mtColor.bg, mtColor.border)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTimingDetails(!showTimingDetails); }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Market Timing</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-lg font-extrabold", mtColor.text)}>{stock.tacticalScore}</span>
                    {showTimingDetails ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight font-medium">Measures whether current market conditions favor action.</p>

                {showTimingDetails && stock.marketTimingSignals && (
                  <div className="mt-3 pt-3 border-t border-border/10 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <SignalRow label="Technical Trend" status={stock.marketTimingSignals.technical} />
                    <SignalRow label="Momentum" status={stock.marketTimingSignals.momentum} />
                    <SignalRow label="Sector Timing" status={stock.marketTimingSignals.sector} />
                    <SignalRow label="Event Risk" status={stock.marketTimingSignals.event} />
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment Section (Static) */}
            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sentiment</span>
                <span className="text-sm font-bold text-slate-500">{stock.sentimentScore || 50}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight font-medium">Measures current market positioning and tone.</p>
            </div>
          </div>

          {/* Market Status (Footer) */}
          <div className="pt-4 mt-auto border-t border-border/10 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Market Context</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {stock.marketRegime === 'RISK_ON' ? 'Supportive' : stock.marketRegime === 'RISK_OFF' ? 'Risk-Off' : 'Neutral'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

