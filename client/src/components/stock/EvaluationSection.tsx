import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { useState } from "react";
import type { EvaluationDetail } from "@shared/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EvaluationSectionProps {
  title: string;
  items: string[];
  type: "positive" | "risk" | "failure";
  defaultOpen?: boolean;
}

export function EvaluationSection({
  title,
  items,
  type,
  defaultOpen = false,
}: EvaluationSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  const iconMap = {
    positive: <CheckCircle2 className="w-4 h-4 text-stock-eligible" />,
    risk: <AlertTriangle className="w-4 h-4 text-stock-watch" />,
    failure: <XCircle className="w-4 h-4 text-stock-reject" />,
  };

  const bgMap = {
    positive: "bg-stock-eligible-muted/50",
    risk: "bg-stock-watch-muted/50",
    failure: "bg-stock-reject-muted/50",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-md transition-colors hover-elevate",
          bgMap[type]
        )}
        data-testid={`trigger-${type}-section`}
      >
        <div className="flex items-center gap-2">
          {iconMap[type]}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ul className="space-y-1.5 pl-6">
          {items.map((item, index) => (
            <li
              key={index}
              className="text-sm text-muted-foreground flex items-start gap-2"
            >
              <span className="text-muted-foreground/50 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DetailedEvaluationProps {
  detail: EvaluationDetail;
}

export function DetailedEvaluation({ detail }: DetailedEvaluationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const statusColors = {
    pass: "text-stock-eligible bg-stock-eligible-muted/50",
    caution: "text-stock-watch bg-stock-watch-muted/50",
    fail: "text-stock-reject bg-stock-reject-muted/50",
  };

  const statusIcons = {
    pass: <CheckCircle2 className="w-4 h-4" />,
    caution: <AlertTriangle className="w-4 h-4" />,
    fail: <XCircle className="w-4 h-4" />,
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className="w-full p-3 rounded-md bg-muted/30 hover-elevate transition-colors"
        data-testid={`trigger-detail-${detail.name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-1.5 rounded", statusColors[detail.status])}>
              {statusIcons[detail.status]}
            </div>
            <div className="text-left">
              <div className="font-medium text-sm flex items-center gap-1.5">
                {detail.name}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{detail.summary}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">{detail.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">
              {detail.score}/{detail.maxScore}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-12">
        <ul className="space-y-1">
          {detail.breakdown.map((item, index) => (
            <li
              key={index}
              className="text-xs text-muted-foreground flex items-start gap-2"
            >
              <span className="text-muted-foreground/50 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
