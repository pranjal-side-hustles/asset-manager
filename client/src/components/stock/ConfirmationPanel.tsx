/**
 * Confirmation Panel Component
 * 
 * Full panel showing all 5 confirmation layers with detailed breakdown.
 * Used on stock detail pages to show confirmation layer analysis.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
    ConfirmationResult,
    ConfirmationLayerResult,
    ConfirmationFlag,
    ConfirmationLayerName,
} from "@shared/types/confirmation";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Building2,
    BarChart3,
    MessageSquare,
    Calendar,
    Activity,
    AlertTriangle,
} from "lucide-react";

interface ConfirmationPanelProps {
    confirmation: ConfirmationResult;
    className?: string;
}

const layerIcons: Record<ConfirmationLayerName, React.ComponentType<{ className?: string }>> = {
    BREADTH: Activity,
    INSTITUTIONAL: Building2,
    OPTIONS: BarChart3,
    SENTIMENT: MessageSquare,
    EVENTS: Calendar,
};

const layerLabels: Record<ConfirmationLayerName, string> = {
    BREADTH: "Breadth & Flow",
    INSTITUTIONAL: "Institutional Activity",
    OPTIONS: "Options Confirmation",
    SENTIMENT: "Sentiment",
    EVENTS: "Events",
};

const signalStyles = {
    CONFIRMING: {
        icon: TrendingUp,
        iconClass: "text-green-400",
        bgClass: "bg-green-500/10 border-green-500/30",
        label: "Confirming",
    },
    NEUTRAL: {
        icon: Minus,
        iconClass: "text-gray-400",
        bgClass: "bg-gray-500/10 border-gray-500/30",
        label: "Neutral",
    },
    DISCONFIRMING: {
        icon: TrendingDown,
        iconClass: "text-red-400",
        bgClass: "bg-red-500/10 border-red-500/30",
        label: "Disconfirming",
    },
};

const flagLabels: Record<ConfirmationFlag, { label: string; severity: "warning" | "info" }> = {
    EARNINGS_IMMINENT: { label: "Earnings Imminent (< 5 days)", severity: "warning" },
    EARNINGS_SOON: { label: "Earnings Soon (5-14 days)", severity: "info" },
    INSIDER_SELLING: { label: "Insider Selling Detected", severity: "warning" },
    INSIDER_BUYING: { label: "Insider Buying Detected", severity: "info" },
    HIGH_PUT_CALL: { label: "High Put/Call Ratio", severity: "warning" },
    LOW_PUT_CALL: { label: "Low Put/Call Ratio (Bullish)", severity: "info" },
    ELEVATED_IV: { label: "Elevated Implied Volatility", severity: "warning" },
    INSTITUTIONAL_EXIT: { label: "Institutional Selling", severity: "warning" },
    WEAK_BREADTH: { label: "Weak Market Breadth", severity: "warning" },
    DIVIDEND_UPCOMING: { label: "Ex-Dividend Upcoming", severity: "info" },
    MAJOR_NEWS_PENDING: { label: "Major News Pending", severity: "warning" },
};

function LayerRow({ layer }: { layer: ConfirmationLayerResult }) {
    const Icon = layerIcons[layer.layer];
    const signalStyle = signalStyles[layer.signal];
    const SignalIcon = signalStyle.icon;

    return (
        <div
            className={cn(
                "p-3 rounded-lg border",
                signalStyle.bgClass
            )}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">{layerLabels[layer.layer]}</span>
                </div>
                <div className="flex items-center gap-2">
                    <SignalIcon className={cn("w-4 h-4", signalStyle.iconClass)} />
                    <span className={cn("text-sm font-medium", signalStyle.iconClass)}>
                        {signalStyle.label}
                    </span>
                    <Badge
                        variant="outline"
                        className={cn(
                            "text-xs ml-2",
                            layer.scoreAdjustment > 0
                                ? "text-green-400 border-green-400/50"
                                : layer.scoreAdjustment < 0
                                    ? "text-red-400 border-red-400/50"
                                    : "text-gray-400 border-gray-400/50"
                        )}
                    >
                        {layer.scoreAdjustment >= 0 ? "+" : ""}{layer.scoreAdjustment}
                    </Badge>
                </div>
            </div>
            {layer.reasons.length > 0 && (
                <ul className="text-xs text-gray-400 space-y-0.5 ml-6">
                    {layer.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx}>• {reason}</li>
                    ))}
                </ul>
            )}
            {!layer.dataAvailable && (
                <p className="text-xs text-gray-500 italic ml-6">Data not available</p>
            )}
        </div>
    );
}

function FlagBadge({ flag }: { flag: ConfirmationFlag }) {
    const config = flagLabels[flag] || { label: flag, severity: "info" as const };

    return (
        <Badge
            variant="outline"
            className={cn(
                "text-xs",
                config.severity === "warning"
                    ? "text-amber-400 border-amber-400/50 bg-amber-500/10"
                    : "text-blue-400 border-blue-400/50 bg-blue-500/10"
            )}
        >
            {config.severity === "warning" && (
                <AlertTriangle className="w-3 h-3 mr-1" />
            )}
            {config.label}
        </Badge>
    );
}

export function ConfirmationPanel({ confirmation, className }: ConfirmationPanelProps) {
    const netAdjustmentText = confirmation.netAdjustment >= 0
        ? `+${confirmation.netAdjustment}`
        : `${confirmation.netAdjustment}`;

    const overallColorClass = confirmation.netAdjustment > 0
        ? "text-green-400"
        : confirmation.netAdjustment < 0
            ? "text-red-400"
            : "text-gray-400";

    return (
        <Card className={cn("bg-slate-900/50 border-slate-700", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-400" />
                        Confirmation Layers
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Net:</span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-sm font-bold",
                                overallColorClass,
                                "border-current"
                            )}
                        >
                            {netAdjustmentText} pts
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Layer rows */}
                {confirmation.layers.map((layer) => (
                    <LayerRow key={layer.layer} layer={layer} />
                ))}

                {/* Flags section */}
                {confirmation.flags.length > 0 && (
                    <div className="pt-3 border-t border-slate-700">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Active Flags
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {confirmation.flags.map((flag) => (
                                <FlagBadge key={flag} flag={flag} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary */}
                <div className="pt-3 border-t border-slate-700 text-xs text-gray-500">
                    <div className="flex justify-between">
                        <span>
                            Confirming: {confirmation.layers.filter(l => l.signal === "CONFIRMING").length}/5
                        </span>
                        <span>
                            Disconfirming: {confirmation.layers.filter(l => l.signal === "DISCONFIRMING").length}/5
                        </span>
                        <span>
                            Signal: <span className={overallColorClass}>{confirmation.overallSignal.replace(/_/g, " ")}</span>
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ConfirmationPanel;
