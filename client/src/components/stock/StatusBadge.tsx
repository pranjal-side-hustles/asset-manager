import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StrategicGrowthStatus, TacticalSentinelStatus } from "@shared/types";

interface StatusBadgeProps {
  status: StrategicGrowthStatus | TacticalSentinelStatus;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<string, { label: string; variant: "eligible" | "watch" | "reject" }> = {
  ELIGIBLE: { label: "Eligible", variant: "eligible" },
  TRADE: { label: "Trade", variant: "eligible" },
  WATCH: { label: "Watch", variant: "watch" },
  REJECT: { label: "Reject", variant: "reject" },
  AVOID: { label: "Avoid", variant: "reject" },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
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
  );
}
