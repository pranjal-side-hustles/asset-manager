import { useState } from "react";
import { ChevronDown, Lightbulb, AlertTriangle, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketRegime } from "@shared/types/marketContext";

interface WhyExplainerProps {
  status: string;
  positives: string[];
  risks: string[];
  failureMode?: string;
  marketRegime?: MarketRegime;
  horizonType: "strategic" | "tactical";
}

function getStatusVerb(status: string): string {
  switch (status) {
    case "ELIGIBLE": return "ELIGIBLE";
    case "TRADE": return "TRADE";
    case "WATCH": return "WATCH";
    case "REJECT": return "REJECT";
    case "AVOID": return "AVOID";
    default: return status;
  }
}

function getRegimeImpactText(marketRegime?: MarketRegime, horizonType?: string): string | null {
  if (!marketRegime) return null;
  
  if (marketRegime === "RISK_OFF") {
    if (horizonType === "strategic") {
      return "Market regime is Risk-Off, applying -10 point adjustment. Strategic patience required.";
    }
    return "Market regime is Risk-Off, applying -12 point adjustment. Tactical trades face headwinds.";
  }
  
  if (marketRegime === "RISK_ON") {
    if (horizonType === "strategic") {
      return "Market regime is Risk-On, applying +5 point boost. Favorable environment for positions.";
    }
    return "Market regime is Risk-On, applying +8 point boost. Momentum setups favored.";
  }
  
  if (marketRegime === "NEUTRAL") {
    if (horizonType === "strategic") {
      return "Market regime is Neutral, applying -2 point adjustment. Selectivity recommended.";
    }
    return "Market regime is Neutral, applying -3 point adjustment. Selective entries only.";
  }
  
  return null;
}

export function WhyExplainer({ 
  status, 
  positives, 
  risks, 
  failureMode, 
  marketRegime,
  horizonType 
}: WhyExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusVerb = getStatusVerb(status);
  const regimeImpact = getRegimeImpactText(marketRegime, horizonType);
  const topPositives = positives.slice(0, 3);
  const topRisks = risks.slice(0, 2);
  
  const statusColors: Record<string, string> = {
    ELIGIBLE: "text-stock-eligible",
    TRADE: "text-stock-eligible",
    WATCH: "text-stock-watch",
    REJECT: "text-stock-reject",
    AVOID: "text-stock-reject",
  };
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden" data-testid="section-why-explainer">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover-elevate transition-colors"
        data-testid="button-why-toggle"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Why <span className={statusColors[status]}>{statusVerb}</span>?
          </span>
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )} 
        />
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3" data-testid="section-why-content">
          {topPositives.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Strengths</p>
              <ul className="space-y-1">
                {topPositives.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-stock-eligible mt-0.5">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {topRisks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Risks</p>
              <ul className="space-y-1">
                {topRisks.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-stock-watch mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {failureMode && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Main Risk</p>
              <div className="text-sm text-stock-reject flex items-start gap-2">
                <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{failureMode}</span>
              </div>
            </div>
          )}
          
          {regimeImpact && (
            <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground" data-testid="text-regime-impact">
              <span className="font-medium">Market Impact:</span> {regimeImpact}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
