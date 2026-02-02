import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { StockHeader } from "@/components/stock/StockHeader";
import { StrategyTooltip } from "@/components/stock/StrategyTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import type { StockEvaluationResponse } from "@shared/types";

function StockDeepDiveSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
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

function getScoreLabel(score: number, type: "SHAPE" | "FORCE" | "Sentiment"): string {
  if (type === "SHAPE") {
    if (score >= 65) return "Strong";
    if (score >= 50) return "Neutral";
    return "Weak";
  }
  if (type === "FORCE") {
    if (score >= 65) return "Strong";
    if (score >= 50) return "Developing";
    return "Weak";
  }
  // Sentiment
  if (score >= 60) return "Positive";
  if (score >= 40) return "Neutral";
  return "Weak";
}

function getScoreColor(score: number): { text: string; border: string; bg: string } {
  if (score >= 65) return { text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (score >= 50) return { text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/30", bg: "bg-blue-50 dark:bg-blue-500/10" };
  return { text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/30", bg: "bg-amber-50 dark:bg-amber-500/10" };
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

import type { EvaluationDetail } from "@shared/types";

// Get status icon and color for indicator
function getStatusIcon(status: "pass" | "caution" | "fail") {
  switch (status) {
    case "pass":
      return { icon: <Check className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
    case "caution":
      return { icon: <AlertCircle className="w-4 h-4" />, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" };
    case "fail":
      return { icon: <X className="w-4 h-4" />, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" };
  }
}

function IndicatorRow({ indicator }: { indicator: EvaluationDetail }) {
  const statusInfo = getStatusIcon(indicator.status);
  const scorePercent = indicator.maxScore > 0 ? Math.round((indicator.score / indicator.maxScore) * 100) : 0;

  return (
    <div className={cn("p-3 rounded-lg border transition-all", statusInfo.bg, "border-border/20")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("flex-shrink-0", statusInfo.color)}>{statusInfo.icon}</span>
            <span className="text-sm font-medium truncate">{indicator.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{indicator.summary}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-bold">
            {indicator.score}/{indicator.maxScore}
          </div>
          <div className="text-[10px] text-muted-foreground">{scorePercent}%</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            indicator.status === "pass" ? "bg-emerald-500" :
              indicator.status === "caution" ? "bg-amber-500" : "bg-rose-500"
          )}
          style={{ width: `${scorePercent}%` }}
        />
      </div>
    </div>
  );
}

// Simple signal row for confirmation checklist
function SignalRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      {passed ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <X className="w-4 h-4 text-amber-500" />
      )}
    </div>
  );
}

interface StrategyCardProps {
  title: string;
  strategy: "SHAPE" | "FORCE";
  score: number;
  description: string;
  indicators: EvaluationDetail[];
  horizonLabel: string;
}

function StrategyCard({ title, strategy, score, description, indicators, horizonLabel }: StrategyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const color = getScoreColor(score);
  const label = getScoreLabel(score, strategy);

  return (
    <Card className={cn("border transition-all", color.border, color.bg)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{title}</span>
            <StrategyTooltip strategy={strategy} />
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{isOpen ? "Hide" : "Show"} Details</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{horizonLabel}</div>

        <div className="flex items-center gap-3">
          <span className={cn("text-3xl font-bold", color.text)}>{score}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", color.border, color.text)}>
            {label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>

        {isOpen && indicators.length > 0 && (
          <div className="pt-4 border-t border-border/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {strategy} Indicators ({indicators.length})
            </div>
            {indicators.map((indicator, i) => (
              <IndicatorRow key={i} indicator={indicator} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SentimentCard({ score }: { score: number }) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score, "Sentiment");

  return (
    <Card className={cn("border transition-all", color.border, color.bg)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">💬 Sentiment</span>
        </div>

        <div className="flex items-center gap-3">
          <span className={cn("text-3xl font-bold", color.text)}>{score}</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", color.border, color.text)}>
            {label}
          </span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Measures current market positioning and tone.
        </p>
      </CardContent>
    </Card>
  );
}

function generateStrategyGuidance(shapeScore: number, forceScore: number): string {
  const shapeLabel = getScoreLabel(shapeScore, "SHAPE");
  const forceLabel = getScoreLabel(forceScore, "FORCE");

  if (shapeLabel === "Strong" && forceLabel === "Strong") {
    return "SHAPE and FORCE are both aligned. Conditions support action.";
  }
  if (shapeLabel === "Strong" && forceLabel === "Developing") {
    return "SHAPE is constructive, but FORCE needs confirmation before acting.";
  }
  if (shapeLabel === "Strong" && forceLabel === "Weak") {
    return "SHAPE is solid, but FORCE signals caution. Patience is appropriate.";
  }
  if (shapeLabel === "Neutral" && forceLabel === "Strong") {
    return "FORCE is favorable, but SHAPE is undifferentiated. Consider sizing down.";
  }
  if (shapeLabel === "Weak") {
    return "SHAPE is weak. Structural concerns override FORCE signals.";
  }
  return "No specific approach fits right now. Waiting is intentional.";
}

export default function StockDeepDive() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase() || "";

  const { data, isLoading, error, refetch } = useQuery<StockEvaluationResponse>({
    queryKey: ["/api/stocks", symbol],
    enabled: !!symbol,
  });

  // Derive scores and signals from evaluation
  const strategicScore = data?.evaluation?.strategicGrowth?.score ?? 50;
  const tacticalScore = data?.evaluation?.tacticalSentinel?.score ?? 50;
  const sentimentScore = data?.evaluation?.tacticalSentinel?.details?.sentimentContext?.score ?? 50;

  // Extract SHAPE indicators (EvaluationDetail arrays)
  const shapeIndicators: EvaluationDetail[] = data?.evaluation?.strategicGrowth?.details
    ? Object.values(data.evaluation.strategicGrowth.details).filter((d): d is EvaluationDetail => d !== undefined && d !== null)
    : [];

  // Extract FORCE indicators (EvaluationDetail arrays)
  const forceIndicators: EvaluationDetail[] = data?.evaluation?.tacticalSentinel?.details
    ? Object.values(data.evaluation.tacticalSentinel.details).filter((d): d is EvaluationDetail => d !== undefined && d !== null)
    : [];

  // Derive confirmation signals (simple pass/fail for checklist)
  const confirmationSignals = data?.evaluation?.strategicGrowth?.details ? [
    { label: "Business fundamentals", passed: data.evaluation.strategicGrowth.details.fundamentalAcceleration?.status === "pass" },
    { label: "Technical trend", passed: data?.evaluation?.tacticalSentinel?.details?.technicalAlignment?.status === "pass" },
    { label: "Institutional backing", passed: data.evaluation.strategicGrowth.details.institutionalSignals?.status === "pass" },
  ] : [];

  const confirmationLevel = confirmationSignals.filter(s => s.passed).length >= 2 ? "Strong" : confirmationSignals.filter(s => s.passed).length === 1 ? "Weak" : "None";

  return (
    <MainLayout>
      {error ? (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Stock Not Found</h2>
              <p className="text-muted-foreground mb-6">
                Unable to find data for symbol "{symbol}". Please check the symbol and try again.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link href="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Button onClick={() => refetch()}>Retry</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : isLoading ? (
        <StockDeepDiveSkeleton />
      ) : data ? (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* Back button */}
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Stock Identity Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{data.stock.symbol}</h1>
              <p className="text-lg text-muted-foreground">{data.stock.companyName}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${data.quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground">Last market close</div>
            </div>
          </div>

          {/* SECTION 1: Decision Summary */}
          <div className="space-y-4">
            {data.decisionLabel && (
              <div className={cn(
                "px-6 py-5 rounded-xl border text-center space-y-2",
                getDecisionColor(data.decisionLabel.label).bg,
                getDecisionColor(data.decisionLabel.label).border,
                getDecisionColor(data.decisionLabel.label).text
              )}>
                <div className="text-lg font-bold uppercase tracking-wider">{data.decisionLabel.displayText}</div>
                <p className="text-sm font-medium opacity-90 max-w-xl mx-auto">{data.decisionLabel.explanation}</p>
              </div>
            )}
          </div>

          {/* SECTION 2: Strategy Scores */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center text-muted-foreground">
              How This Stock Is Structured Right Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StrategyCard
                title="🧱 SHAPE"
                strategy="SHAPE"
                score={strategicScore}
                description="SHAPE measures the structural quality of the business over the next several months."
                indicators={shapeIndicators}
                horizonLabel="4-9 month horizon"
              />
              <StrategyCard
                title="⚡ FORCE"
                strategy="FORCE"
                score={tacticalScore}
                description="FORCE measures how market conditions may impact this stock in the near term."
                indicators={forceIndicators}
                horizonLabel="0-4 month horizon"
              />
              <SentimentCard score={sentimentScore} />
            </div>
          </div>

          {/* SECTION 3: Market Confirmation */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Market Confirmation</h3>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold",
                  confirmationLevel === "Strong" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                    confirmationLevel === "Weak" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" :
                      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  {confirmationLevel}
                </span>
              </div>
              <div className="space-y-1">
                {confirmationSignals.map((signal, i) => (
                  <SignalRow key={i} label={signal.label} passed={signal.passed} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: Strategy Guidance */}
          <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <CardContent className="p-5 space-y-2">
              <h3 className="text-base font-semibold">Suggested Approach</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {generateStrategyGuidance(strategicScore, tacticalScore)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </MainLayout>
  );
}
