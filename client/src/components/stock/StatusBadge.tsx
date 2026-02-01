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
  ELIGIBLE: { label: "Looking Strong", variant: "eligible" },
  TRADE: { label: "Ready Now", variant: "eligible" },
  WATCH: { label: "Keep Watching", variant: "watch" },
  REJECT: { label: "Pause for Now", variant: "reject" },
  AVOID: { label: "Not Right Now", variant: "reject" },
};

function getRegimeContext(status: string, marketRegime?: MarketRegime): string | null {
  if (!marketRegime) return null;
  
  if (marketRegime === "RISK_OFF") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Strong despite cautious market";
    }
    if (status === "WATCH") {
      return "Market conditions challenging";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Best to wait";
    }
  }
  
  if (marketRegime === "RISK_ON") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Market supports this";
    }
    if (status === "WATCH") {
      return "Almost ready";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Needs improvement";
    }
  }
  
  if (marketRegime === "NEUTRAL") {
    if (status === "TRADE" || status === "ELIGIBLE") {
      return "Good in mixed market";
    }
    if (status === "WATCH") {
      return "Be selective";
    }
    if (status === "REJECT" || status === "AVOID") {
      return "Not ready yet";
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
