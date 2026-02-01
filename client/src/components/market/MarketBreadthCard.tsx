/**
 * Market Breadth Card Component
 * 
 * Dashboard card showing market breadth indicators:
 * - % stocks above 200 DMA
 * - Advance/Decline ratio
 * - New Highs vs New Lows
 * - Overall breadth health
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BreadthData, BreadthHealth } from "@shared/types/marketContext";

interface MarketBreadthCardProps {
    breadth: BreadthData;
    className?: string;
}

const healthConfig: Record<BreadthHealth, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
}> = {
    STRONG: {
        label: "Strong",
        color: "text-green-400",
        bgColor: "bg-green-500/20 border-green-500/50",
        icon: TrendingUp,
    },
    NEUTRAL: {
        label: "Neutral",
        color: "text-gray-400",
        bgColor: "bg-gray-500/20 border-gray-500/50",
        icon: Minus,
    },
    WEAK: {
        label: "Weak",
        color: "text-red-400",
        bgColor: "bg-red-500/20 border-red-500/50",
        icon: TrendingDown,
    },
};

function BreadthIndicator({
    label,
    value,
    format,
    isPositive,
}: {
    label: string;
    value: number;
    format: "percent" | "ratio";
    isPositive?: boolean;
}) {
    const displayValue = format === "percent"
        ? `${value.toFixed(0)}%`
        : value.toFixed(2);

    // Determine color based on value
    let colorClass = "text-gray-400";
    if (isPositive !== undefined) {
        colorClass = isPositive ? "text-green-400" : "text-red-400";
    } else if (format === "ratio") {
        colorClass = value >= 1.2 ? "text-green-400" : value <= 0.8 ? "text-red-400" : "text-gray-400";
    } else if (format === "percent") {
        colorClass = value >= 60 ? "text-green-400" : value <= 40 ? "text-red-400" : "text-gray-400";
    }

    return (
        <div className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-400">{label}</span>
            <span className={cn("text-sm font-medium", colorClass)}>{displayValue}</span>
        </div>
    );
}

export function MarketBreadthCard({ breadth, className }: MarketBreadthCardProps) {
    const healthInfo = healthConfig[breadth.health];
    const HealthIcon = healthInfo.icon;

    // Calculate progress bar value (0-100)
    const progressValue = Math.max(0, Math.min(100, breadth.pctAbove200DMA));

    return (
        <Card className={cn("bg-slate-900/50 border-slate-700", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" />
                        Market Breadth
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className={cn("text-xs", healthInfo.bgColor, healthInfo.color)}
                    >
                        <HealthIcon className="w-3 h-3 mr-1" />
                        {healthInfo.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* % Above 200 DMA with progress bar */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Stocks Above 200 DMA</span>
                        <span className={cn(
                            "text-sm font-medium",
                            progressValue >= 60 ? "text-green-400" :
                                progressValue <= 40 ? "text-red-400" : "text-gray-400"
                        )}>
                            {progressValue.toFixed(0)}%
                        </span>
                    </div>
                    <Progress
                        value={progressValue}
                        className="h-1.5"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                        <span>Bearish</span>
                        <span>Neutral</span>
                        <span>Bullish</span>
                    </div>
                </div>

                {/* Other indicators */}
                <div className="border-t border-slate-700 pt-2">
                    <BreadthIndicator
                        label="Advance/Decline Ratio"
                        value={breadth.advanceDeclineRatio}
                        format="ratio"
                    />
                    <BreadthIndicator
                        label="New Highs/Lows Ratio"
                        value={breadth.newHighsLowsRatio}
                        format="ratio"
                    />
                </div>

                {/* Interpretation */}
                <div className="border-t border-slate-700 pt-2">
                    <p className="text-xs text-gray-500">
                        {breadth.health === "STRONG" && (
                            <>Strong breadth suggests broad market participation. Bullish for new positions.</>
                        )}
                        {breadth.health === "NEUTRAL" && (
                            <>Mixed breadth. Selectivity is key - focus on relative strength.</>
                        )}
                        {breadth.health === "WEAK" && (
                            <>Weak breadth indicates narrow leadership. Use caution with new positions.</>
                        )}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default MarketBreadthCard;
