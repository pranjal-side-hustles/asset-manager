import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import type { Stock, StockQuote, DataConfidence } from "@shared/types";
import { DataConfidenceBadge } from "./DataConfidenceBadge";

interface StockHeaderProps {
  stock: Stock;
  quote: StockQuote;
  dataConfidence?: DataConfidence;
  warnings?: string[];
  providersUsed?: string[];
}

export function StockHeader({ 
  stock, 
  quote, 
  dataConfidence, 
  warnings, 
  providersUsed 
}: StockHeaderProps) {
  const isPositive = quote.change >= 0;

  return (
    <div className="space-y-4" data-testid="stock-header">
      <Link href="/">
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-symbol">
              {stock.symbol}
            </h1>
            <span className="px-2 py-1 bg-muted rounded text-xs font-medium text-muted-foreground">
              {stock.sector}
            </span>
            {dataConfidence && (
              <DataConfidenceBadge 
                confidence={dataConfidence} 
                warnings={warnings} 
                providersUsed={providersUsed} 
              />
            )}
          </div>
          <p className="text-lg text-muted-foreground" data-testid="text-company-name">
            {stock.companyName}
          </p>
        </div>

        <div className="flex items-end gap-4">
          <div className="text-right">
            <p className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-price">
              ${quote.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div
              className={cn(
                "flex items-center justify-end gap-1 text-sm font-medium",
                isPositive ? "text-stock-positive" : "text-stock-negative"
              )}
              data-testid="text-change"
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {quote.change.toFixed(2)} ({isPositive ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2 text-sm text-muted-foreground border-t border-border/50">
        <div>
          <span className="text-xs uppercase tracking-wide">Open</span>
          <p className="font-medium text-foreground">${quote.open.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide">High</span>
          <p className="font-medium text-foreground">${quote.high.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide">Low</span>
          <p className="font-medium text-foreground">${quote.low.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide">Prev Close</span>
          <p className="font-medium text-foreground">${quote.previousClose.toFixed(2)}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide">Volume</span>
          <p className="font-medium text-foreground">
            {(quote.volume / 1000000).toFixed(2)}M
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide">Market Cap</span>
          <p className="font-medium text-foreground">
            ${(stock.marketCap / 1000000000).toFixed(2)}B
          </p>
        </div>
      </div>
    </div>
  );
}
