/**
 * Confirmation Badge Component
 * 
 * A compact badge showing overall confirmation signal for stock cards.
 * Color-coded: Green (confirming) / Yellow (neutral) / Red (disconfirming)
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OverallConfirmationSignal } from "@shared/types/confirmation";

interface ConfirmationBadgeProps {
    signal: OverallConfirmationSignal;
    netAdjustment: number;
    className?: string;
}

const signalConfig: Record<OverallConfirmationSignal, {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    bgClass: string;
    textClass: string;
}> = {
    STRONG_CONFIRM: {
        label: "Strong Confirm",
        variant: "default",
        bgClass: "bg-emerald-500/20 border-emerald-500/50",
        textClass: "text-emerald-400",
    },
    CONFIRM: {
        label: "Confirm",
        variant: "default",
        bgClass: "bg-green-500/20 border-green-500/50",
        textClass: "text-green-400",
    },
    NEUTRAL: {
        label: "Neutral",
        variant: "secondary",
        bgClass: "bg-gray-500/20 border-gray-500/50",
        textClass: "text-gray-400",
    },
    DISCONFIRM: {
        label: "Disconfirm",
        variant: "destructive",
        bgClass: "bg-amber-500/20 border-amber-500/50",
        textClass: "text-amber-400",
    },
    STRONG_DISCONFIRM: {
        label: "Strong Disconfirm",
        variant: "destructive",
        bgClass: "bg-red-500/20 border-red-500/50",
        textClass: "text-red-400",
    },
};

export function ConfirmationBadge({
    signal,
    netAdjustment,
    className,
}: ConfirmationBadgeProps) {
    const config = signalConfig[signal] || signalConfig.NEUTRAL;
    const adjustmentText = netAdjustment >= 0 ? `+${netAdjustment}` : `${netAdjustment}`;

    return (
        <Badge
            variant={config.variant}
            className={cn(
                "text-xs font-medium",
                config.bgClass,
                config.textClass,
                className
            )}
        >
            {config.label} ({adjustmentText} pts)
        </Badge>
    );
}

export function ConfirmationBadgeCompact({
    signal,
    netAdjustment,
    className,
}: ConfirmationBadgeProps) {
    const config = signalConfig[signal] || signalConfig.NEUTRAL;
    const adjustmentText = netAdjustment >= 0 ? `+${netAdjustment}` : `${netAdjustment}`;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                config.textClass,
                className
            )}
        >
            <span className={cn(
                "w-2 h-2 rounded-full",
                signal === "STRONG_CONFIRM" || signal === "CONFIRM" ? "bg-green-500" :
                    signal === "NEUTRAL" ? "bg-gray-500" : "bg-red-500"
            )} />
            {adjustmentText}
        </span>
    );
}

export default ConfirmationBadge;
