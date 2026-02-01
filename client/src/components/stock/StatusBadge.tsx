import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StrategicGrowthStatus, TacticalSentinelStatus } from "@shared/types";
import type { MarketRegime } from "@shared/types/marketContext";

interface StatusBadgeProps {
  status: StrategicGrowthStatus | TacticalSentinelStatus;
  size?: "sm" | "md" | "lg";
  marketRegime?: MarketRegime;
  showRegimeContext?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "eligible" | "watch" | "reject" }> = {
  ELIGIBLE: { label: "Eligible", variant: "eligible" },
  TRADE: { label: "Trade", variant: "eligible" },
  WATCH: { label: "Watch", variant: "watch" },
  REJECT: { label: "Reject", variant: "reject" },
  AVOID: { label: "Avoid", variant: "reject" },
};

function getRegimeContext(status: string, marketRegime?: MarketRegime): string | null {
  if (!marketRegime) return null;
  
  if (marketRegime === "RISK_OFF") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Despite Risk-Off";
    }
    if (status === "WATCH") {
      return "Regime Headwind";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Structure Broken";
    }
  }
  
  if (marketRegime === "RISK_ON") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Regime Tailwind";
    }
    if (status === "WATCH") {
      return "Needs Confirmation";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Technical Breakdown";
    }
  }
  
  if (marketRegime === "NEUTRAL") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Mixed Market";
    }
    if (status === "WATCH") {
      return "Selective Entry";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Weak Setup";
    }
  }
  
  return null;
}

export function StatusBadge({ status, size = "md", marketRegime, showRegimeContext = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const regimeContext = showRegimeContext ? getRegimeContext(status, marketRegime) : null;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const variantClasses = {
    eligible: "bg-stock-eligible text-stock-eligible-foreground",
    watch: "bg-stock-watch text-stock-watch-foreground",
    reject: "bg-stock-reject text-stock-reject-foreground",
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge
        data-testid={`badge-status-${status.toLowerCase()}`}
        className={cn(
          "font-semibold border-none",
          sizeClasses[size],
          variantClasses[config.variant]
        )}
      >
        {config.label}
      </Badge>
      {regimeContext && (
        <span 
          className="text-[10px] text-muted-foreground whitespace-nowrap"
          data-testid="text-regime-context"
        >
          ({regimeContext})
        </span>
      )}
    </div>
  );
}
