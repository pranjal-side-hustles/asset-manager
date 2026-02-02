import { HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface StrategyTooltipProps {
    strategy: "SHAPE" | "FORCE";
}

const STRATEGY_TOOLTIPS: Record<string, string> = {
    SHAPE: "SHAPE looks at the strength and structure of a business over the next several months.",
    FORCE: "FORCE looks at how current market conditions may impact a stock in the near term.",
};

export function StrategyTooltip({ strategy }: StrategyTooltipProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-help"
                    aria-label={`What is ${strategy}?`}
                >
                    <HelpCircle className="w-3 h-3 text-muted-foreground/70" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-center">
                <p className="text-xs leading-relaxed">{STRATEGY_TOOLTIPS[strategy]}</p>
            </TooltipContent>
        </Tooltip>
    );
}
