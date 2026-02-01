import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { DashboardStock } from "@shared/types";

interface StockCardProps {
  stock: DashboardStock;
}

export function StockCard({ stock }: StockCardProps) {
  const priceAvailable = stock.priceAvailable;

  return (
    <Link href={`/stocks/${stock.symbol.toUpperCase()}`}>
      <Card
        className="hover:translate-y-[-2px] hover:shadow-md cursor-pointer transition-all duration-300 group overflow-hidden h-full border-border/30 bg-card/40 backdrop-blur-sm"
        data-testid={`card-stock-${stock.symbol.toLowerCase()}`}
      >
        <CardContent className="p-6 h-full flex flex-col items-center">
          {/* Top Row: Identity & Context */}
          <div className="w-full flex justify-between items-start mb-10">
            <div className="text-left">
              <h3 className="text-xl font-bold text-foreground/90 tracking-tight" data-testid={`text-symbol-${stock.symbol.toLowerCase()}`}>
                {stock.symbol}
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium line-clamp-1">
                {stock.companyName}
              </p>
            </div>

            {/* Market Context Badge (Neutral Only) */}
            <div className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
                Market: {stock.marketRegime === 'RISK_ON' ? 'Supportive' : stock.marketRegime === 'RISK_OFF' ? 'Risk-Off' : 'Mixed'}
              </span>
            </div>
          </div>

          {/* Main Message: Decision Status (Large, Centered) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 mb-8">
            <h2 className="text-2xl font-bold text-foreground/90 tracking-tight" data-testid={`text-decision-label-${stock.symbol.toLowerCase()}`}>
              {stock.decisionLabel?.displayText || "Keep an Eye On"}
            </h2>
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              {stock.decisionLabel?.explanation || "Conditions are developing"}
            </p>
          </div>

          {/* Quiet Price Area (Factual, no hype) */}
          <div className="w-full pt-4 border-t border-border/20 flex flex-col items-center text-center">
            {priceAvailable ? (
              <>
                <div className="text-lg font-medium text-slate-500 dark:text-slate-400" data-testid={`text-price-${stock.symbol.toLowerCase()}`}>
                  ${stock.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                  Last market close
                </div>
              </>
            ) : (
              <div className="text-sm font-medium text-slate-400 py-2">
                Price Unavailable
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

