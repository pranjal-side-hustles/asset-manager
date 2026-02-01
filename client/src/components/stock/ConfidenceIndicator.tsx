import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataConfidence } from "@shared/types";

interface ConfidenceIndicatorProps {
  confidence: DataConfidence;
  reasons?: string[];
  size?: "sm" | "md";
}

const confidenceConfig = {
  HIGH: {
    label: "High",
    className: "bg-stock-eligible/15 text-stock-eligible border-stock-eligible/20",
    description: "All data sources available",
  },
  MEDIUM: {
    label: "Medium", 
    className: "bg-stock-watch/15 text-stock-watch border-stock-watch/20",
    description: "Some data sources limited",
  },
  LOW: {
    label: "Low",
    className: "bg-stock-reject/15 text-stock-reject border-stock-reject/20",
    description: "Limited data availability",
  },
};

export function ConfidenceIndicator({ confidence, reasons = [], size = "md" }: ConfidenceIndicatorProps) {
  const config = confidenceConfig[confidence];
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
  };

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <p className="font-medium">Data Confidence: {config.label}</p>
      <p className="text-muted-foreground">{config.description}</p>
      {reasons.length > 0 && (
        <ul className="text-xs space-y-1 text-muted-foreground">
          {reasons.slice(0, 4).map((reason, i) => (
            <li key={i} className="flex items-start gap-1">
              <span>-</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help" data-testid="indicator-confidence">
          <Badge 
            variant="outline"
            className={cn(
              "border gap-1",
              sizeClasses[size],
              config.className
            )}
          >
            <Info className="w-3 h-3" />
            {config.label} Confidence
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
