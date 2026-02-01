import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DataConfidence } from "@shared/types";

interface DataConfidenceBadgeProps {
  confidence: DataConfidence;
  warnings?: string[];
  providersUsed?: string[];
}

export function DataConfidenceBadge({ 
  confidence, 
  warnings = [], 
  providersUsed = [] 
}: DataConfidenceBadgeProps) {
  const getConfidenceConfig = () => {
    switch (confidence) {
      case "HIGH":
        return {
          icon: ShieldCheck,
          label: "High Confidence",
          className: "bg-stock-eligible/10 text-stock-eligible border-stock-eligible/20",
        };
      case "MEDIUM":
        return {
          icon: ShieldAlert,
          label: "Medium Confidence",
          className: "bg-stock-watch/10 text-stock-watch border-stock-watch/20",
        };
      case "LOW":
        return {
          icon: ShieldQuestion,
          label: "Low Confidence",
          className: "bg-stock-reject/10 text-stock-reject border-stock-reject/20",
        };
    }
  };

  const config = getConfidenceConfig();
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${config.className} gap-1 cursor-help`}
          data-testid="badge-data-confidence"
        >
          <Icon className="h-3 w-3" />
          <span>{config.label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2 text-xs">
          {providersUsed.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Data Sources:</span>
              <div className="text-muted-foreground mt-1">
                {providersUsed.join(", ")}
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <span className="font-medium text-stock-watch flex items-center gap-1">
                <Info className="h-3 w-3" />
                Warnings:
              </span>
              <ul className="text-muted-foreground mt-1 list-disc pl-4">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length === 0 && providersUsed.length === 0 && (
            <span className="text-muted-foreground">All data sources responding normally</span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
