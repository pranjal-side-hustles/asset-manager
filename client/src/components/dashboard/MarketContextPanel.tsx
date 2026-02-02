import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, AlertTriangle, Layers } from "lucide-react";
import type { DashboardResponse } from "@shared/types";

interface MarketContextPanelProps {
    data: DashboardResponse;
    onSummaryClick: (filter: string) => void;
}

function getRegimeLabelStyle(regime?: string): { bg: string; text: string } {
    switch (regime) {
        case "RISK_ON":
            return { bg: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-700 dark:text-emerald-400" };
        case "RISK_OFF":
            return { bg: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-700 dark:text-amber-400" };
        default:
            return { bg: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-700 dark:text-blue-400" };
    }
}

function getConfidenceLabelStyle(confidence?: string): { bg: string; text: string } {
    switch (confidence) {
        case "HIGH":
            return { bg: "bg-slate-100 dark:bg-slate-700/50", text: "text-slate-700 dark:text-slate-300" };
        case "LOW":
            return { bg: "bg-slate-50 dark:bg-slate-800/50", text: "text-slate-500 dark:text-slate-400" };
        default:
            return { bg: "bg-slate-100 dark:bg-slate-700/40", text: "text-slate-600 dark:text-slate-400" };
    }
}

function getRegimeLabel(regime?: string): string {
    switch (regime) {
        case "RISK_ON":
            return "Market Supportive";
        case "RISK_OFF":
            return "Market Cautious";
        default:
            return "Market Mixed";
    }
}

interface SummaryTileProps {
    title: string;
    count: number;
    icon: React.ReactNode;
    color: string;
    onClick: () => void;
}

function SummaryTile({ title, count, icon, color, onClick }: SummaryTileProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-1 p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer text-left",
                "bg-card/50 hover:bg-card/80"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", color)}>
                    {icon}
                </div>
                <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground font-medium">{title}</div>
                </div>
            </div>
        </button>
    );
}

// ETF index configuration
const ETF_CONFIG = [
    { key: "spy" as const, symbol: "SPY", name: "S&P 500" },
    { key: "qqq" as const, symbol: "QQQ", name: "Nasdaq 100" },
    { key: "dia" as const, symbol: "DIA", name: "Dow Jones" },
    { key: "iwm" as const, symbol: "IWM", name: "Russell 2000" },
];

export function MarketContextPanel({ data, onSummaryClick }: MarketContextPanelProps) {
    const regimeLabelStyle = getRegimeLabelStyle(data.marketRegime);
    const confidenceLabelStyle = getConfidenceLabelStyle(data.marketConfidence);
    const regimeLabel = getRegimeLabel(data.marketRegime);
    const isRiskOff = data.marketRegime === "RISK_OFF";

    // Calculate summary counts using exact filter logic
    const readyNowCount = data.stocks.filter(s =>
        s.tacticalScore >= 65 &&
        s.strategicScore >= 55 &&
        s.decisionLabel?.label !== "PAUSE" &&
        !isRiskOff
    ).length;

    const keepWatchingCount = data.stocks.filter(s => {
        const strongShape = s.strategicScore >= 60;
        const developingForce = s.tacticalScore >= 40 && s.tacticalScore < 65;
        const forceBlockedByConfirmation = s.tacticalScore >= 65 && s.decisionLabel?.label === "KEEP_AN_EYE_ON";
        const forceBlockedByMarket = s.tacticalScore >= 65 && isRiskOff;
        return strongShape && (developingForce || forceBlockedByConfirmation || forceBlockedByMarket);
    }).length;

    const strongShapeCount = data.stocks.filter(s => s.strategicScore >= 65).length;
    const strongForceCount = data.stocks.filter(s => s.tacticalScore >= 65).length;

    return (
        <div className="space-y-6">
            {/* Main Market Context Card - NEUTRAL BACKGROUND */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-card">
                <CardContent className="p-6 space-y-5">
                    {/* Regime Header - Only labels are colored */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
                                regimeLabelStyle.bg, regimeLabelStyle.text
                            )}>
                                <Activity className="w-4 h-4" />
                                {regimeLabel}
                            </span>
                        </div>
                        <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium",
                            confidenceLabelStyle.bg, confidenceLabelStyle.text
                        )}>
                            {data.marketConfidence || "Medium"} Confidence
                        </span>
                    </div>

                    {/* Index ETF Grid - Full data display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ETF_CONFIG.map((etf) => {
                            const indexData = data.indices?.[etf.key];
                            const price = indexData?.price ?? 0;
                            const changePercent = indexData?.changePercent ?? 0;
                            const above200DMA = indexData?.above200DMA ?? true;
                            const isPositive = changePercent >= 0;

                            return (
                                <div key={etf.symbol} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-bold">{etf.symbol}</span>
                                        {above200DMA ? (
                                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1">{etf.name}</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-lg font-semibold">
                                            ${price > 0 ? price.toFixed(2) : "—"}
                                        </span>
                                        <span className={cn(
                                            "text-xs font-medium",
                                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                        )}>
                                            {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        {above200DMA ? "Above trend" : "Below trend"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Breadth & Sentiment Row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                            <div className="text-xs text-muted-foreground mb-1">Breadth</div>
                            <div className="text-sm font-semibold">
                                {data.marketRegime === "RISK_ON" ? "Healthy" : data.marketRegime === "RISK_OFF" ? "Narrow" : "Mixed"}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                            <div className="text-xs text-muted-foreground mb-1">Fear Level</div>
                            <div className="text-sm font-semibold">
                                {data.marketRegime === "RISK_ON" ? "Low" : data.marketRegime === "RISK_OFF" ? "Elevated" : "Normal"}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 col-span-2 md:col-span-1">
                            <div className="text-xs text-muted-foreground mb-1">Sector Participation</div>
                            <div className="text-sm font-semibold">
                                {data.marketRegime === "RISK_ON" ? "Broad" : data.marketRegime === "RISK_OFF" ? "Defensive" : "Selective"}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Tiles Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryTile
                    title="Ready Now"
                    count={readyNowCount}
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                    color="bg-emerald-100 dark:bg-emerald-500/20"
                    onClick={() => onSummaryClick("ready")}
                />
                <SummaryTile
                    title="Keep Watching"
                    count={keepWatchingCount}
                    icon={<AlertTriangle className="w-4 h-4 text-slate-600" />}
                    color="bg-slate-100 dark:bg-slate-500/20"
                    onClick={() => onSummaryClick("watching")}
                />
                <SummaryTile
                    title="Strong SHAPE"
                    count={strongShapeCount}
                    icon={<Layers className="w-4 h-4 text-blue-600" />}
                    color="bg-blue-100 dark:bg-blue-500/20"
                    onClick={() => onSummaryClick("shape")}
                />
                <SummaryTile
                    title="Strong FORCE"
                    count={strongForceCount}
                    icon={<BarChart3 className="w-4 h-4 text-purple-600" />}
                    color="bg-purple-100 dark:bg-purple-500/20"
                    onClick={() => onSummaryClick("force")}
                />
            </div>
        </div>
    );
}
