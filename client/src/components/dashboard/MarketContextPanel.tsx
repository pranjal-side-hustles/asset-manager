import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, AlertTriangle, Layers } from "lucide-react";
import type { DashboardResponse } from "@shared/types";

interface MarketContextPanelProps {
    data: DashboardResponse;
    onSummaryClick: (filter: string) => void;
}

function getRegimeColor(regime?: string): { bg: string; text: string; border: string } {
    switch (regime) {
        case "RISK_ON":
            return { bg: "bg-emerald-100/50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-500/30" };
        case "RISK_OFF":
            return { bg: "bg-amber-100/50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-500/30" };
        default:
            return { bg: "bg-blue-100/50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-500/30" };
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

export function MarketContextPanel({ data, onSummaryClick }: MarketContextPanelProps) {
    const regimeColor = getRegimeColor(data.marketRegime);
    const regimeLabel = getRegimeLabel(data.marketRegime);

    // Calculate summary counts
    const readyNowCount = data.stocks.filter(s => s.decisionLabel?.label === "GOOD_TO_ACT").length;
    const keepWatchingCount = data.stocks.filter(s => s.decisionLabel?.label === "KEEP_AN_EYE_ON").length;
    const strongShapeCount = data.stocks.filter(s => s.strategicScore >= 65).length;
    const strongForceCount = data.stocks.filter(s => s.tacticalScore >= 65).length;

    return (
        <div className="space-y-6">
            {/* Main Market Context Card */}
            <Card className={cn("border transition-all", regimeColor.border, regimeColor.bg)}>
                <CardContent className="p-6 space-y-5">
                    {/* Regime Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className={cn("w-5 h-5", regimeColor.text)} />
                            <span className={cn("text-lg font-bold", regimeColor.text)}>{regimeLabel}</span>
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {data.marketConfidence || "Medium"} Confidence
                        </span>
                    </div>

                    {/* Index Summary Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { symbol: "SPY", label: "S&P 500" },
                            { symbol: "QQQ", label: "Nasdaq" },
                            { symbol: "DIA", label: "Dow Jones" },
                            { symbol: "IWM", label: "Russell 2000" },
                        ].map((index) => (
                            <div key={index.symbol} className="p-3 rounded-lg bg-background/50 border border-border/20">
                                <div className="text-xs text-muted-foreground font-medium">{index.label}</div>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-sm font-bold">{index.symbol}</span>
                                    {data.marketRegime === "RISK_ON" ? (
                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    ) : data.marketRegime === "RISK_OFF" ? (
                                        <TrendingDown className="w-3 h-3 text-amber-500" />
                                    ) : (
                                        <Minus className="w-3 h-3 text-slate-400" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Breadth & Sentiment Row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-background/30 border border-border/10">
                            <div className="text-xs text-muted-foreground mb-1">Breadth</div>
                            <div className="text-sm font-semibold">
                                {data.marketRegime === "RISK_ON" ? "Healthy" : data.marketRegime === "RISK_OFF" ? "Narrow" : "Mixed"}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-background/30 border border-border/10">
                            <div className="text-xs text-muted-foreground mb-1">Fear Level</div>
                            <div className="text-sm font-semibold">
                                {data.marketRegime === "RISK_ON" ? "Low" : data.marketRegime === "RISK_OFF" ? "Elevated" : "Normal"}
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-background/30 border border-border/10 col-span-2 md:col-span-1">
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
