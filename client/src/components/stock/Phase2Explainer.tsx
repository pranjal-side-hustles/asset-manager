import { ChevronDown, ChevronUp, Target, Building2, Briefcase, MessageSquare } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Phase2ExplainerProps {
  capitalPriority: "BUY" | "ACCUMULATE" | "PILOT" | "WATCH" | "BLOCKED";
  sector?: string;
  sectorRegime?: "FAVORED" | "NEUTRAL" | "AVOID";
  portfolioAction?: "ALLOW" | "REDUCE" | "BLOCK";
  rankInSector?: number;
  reasons?: string[];
}

function getSectorRegimeExplanation(regime?: string): string {
  switch (regime) {
    case "FAVORED":
      return "This sector is doing well right now";
    case "NEUTRAL":
      return "This sector is mixed - be selective";
    case "AVOID":
      return "This sector is struggling - extra caution needed";
    default:
      return "Sector information not available";
  }
}

function getPortfolioExplanation(action?: string): string | null {
  switch (action) {
    case "REDUCE":
      return "You may already have enough in similar investments";
    case "BLOCK":
      return "Adding more here could put too much in one basket";
    default:
      return null;
  }
}

function getCapitalPriorityLabel(priority: string): string {
  switch (priority) {
    case "BUY": return "Good to Act Now";
    case "ACCUMULATE": return "Add Gradually";
    case "PILOT": return "Worth a Small Look";
    case "WATCH": return "Keep an Eye On";
    case "BLOCKED": return "Pause for Now";
    default: return priority;
  }
}

export function Phase2Explainer({
  capitalPriority,
  sector,
  sectorRegime,
  portfolioAction,
  rankInSector,
  reasons,
}: Phase2ExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const portfolioExplanation = getPortfolioExplanation(portfolioAction);
  const hasContent = sector || sectorRegime || portfolioExplanation || (reasons && reasons.length > 0);

  if (!hasContent) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        data-testid="button-phase2-explainer"
      >
        <Target className="w-3 h-3" />
        <span>Why we say "{getCapitalPriorityLabel(capitalPriority)}"</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 ml-auto" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div 
          className="mt-2 space-y-2 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {sector && rankInSector && (
            <div className="flex items-start gap-2">
              <Building2 className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                #{rankInSector} in {sector}
              </span>
            </div>
          )}

          {sectorRegime && (
            <div className="flex items-start gap-2">
              <Target className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
              <span className={cn(
                sectorRegime === "FAVORED" ? "text-stock-eligible" :
                sectorRegime === "AVOID" ? "text-stock-reject" :
                "text-stock-watch"
              )}>
                {getSectorRegimeExplanation(sectorRegime)}
              </span>
            </div>
          )}

          {portfolioExplanation && (
            <div className="flex items-start gap-2">
              <Briefcase className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-stock-watch">{portfolioExplanation}</span>
            </div>
          )}

          {reasons && reasons.length > 0 && (
            <div className="flex items-start gap-2">
              <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="space-y-0.5">
                {reasons.map((reason, i) => (
                  <p key={i} className="text-muted-foreground">{reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
