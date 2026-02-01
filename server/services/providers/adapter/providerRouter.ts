import type {
  MarketDataResult,
  PriceQuote,
  OHLCCandle,
  TechnicalIndicators,
  FundamentalsData,
  SentimentData,
  OptionsData,
} from "./types";
import { twelveDataProvider } from "./twelveDataProvider";
import { mockProvider } from "./mockProvider";
import { logger } from "../../../infra/logging/logger";

export interface AggregatedMarketData {
  quote: PriceQuote;
  ohlc: OHLCCandle[];
  technicals: TechnicalIndicators;
  fundamentals: FundamentalsData;
  sentiment: SentimentData;
  options: OptionsData;
  meta: {
    providersUsed: string[];
    providersFailed: string[];
    timestamp: number;
  };
}

async function tryWithFallback<T>(
  primary: () => Promise<MarketDataResult<T>>,
  fallback: () => Promise<MarketDataResult<T>>,
  dataType: string,
  symbol: string
): Promise<MarketDataResult<T>> {
  const log = logger.withContext({ symbol });

  const primaryResult = await primary();
  if (primaryResult.success && primaryResult.data) {
    log.dataFetch(`${dataType} from ${primaryResult.provider}`, { provider: primaryResult.provider });
    return primaryResult;
  }

  log.fallback(`${dataType} failed from primary, using fallback`);
  const fallbackResult = await fallback();
  
  if (fallbackResult.success && fallbackResult.data) {
    return fallbackResult;
  }

  return fallbackResult;
}

export async function getMarketData(symbol: string): Promise<AggregatedMarketData> {
  const upperSymbol = symbol.toUpperCase();
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];

  const useTwelveData = twelveDataProvider.isAvailable();

  const [quoteResult, ohlcResult, technicalsResult, fundamentalsResult, sentimentResult, optionsResult] =
    await Promise.all([
      useTwelveData
        ? tryWithFallback(
            () => twelveDataProvider.getQuote(upperSymbol),
            () => mockProvider.getQuote(upperSymbol),
            "Quote",
            upperSymbol
          )
        : mockProvider.getQuote(upperSymbol),

      useTwelveData
        ? tryWithFallback(
            () => twelveDataProvider.getOHLC(upperSymbol, "1day", 100),
            () => mockProvider.getOHLC(upperSymbol, "1day", 100),
            "OHLC",
            upperSymbol
          )
        : mockProvider.getOHLC(upperSymbol, "1day", 100),

      useTwelveData
        ? tryWithFallback(
            () => twelveDataProvider.getTechnicals(upperSymbol),
            () => mockProvider.getTechnicals(upperSymbol),
            "Technicals",
            upperSymbol
          )
        : mockProvider.getTechnicals(upperSymbol),

      mockProvider.getFundamentals(upperSymbol),

      mockProvider.getSentiment(upperSymbol),

      mockProvider.getOptions(upperSymbol),
    ]);

  const trackResult = <T>(result: MarketDataResult<T>, dataType: string) => {
    if (result.success && result.provider) {
      providersUsed.push(`${result.provider}-${dataType}`);
    } else {
      providersFailed.push(`${result.provider}-${dataType}`);
    }
  };

  trackResult(quoteResult, "Quote");
  trackResult(ohlcResult, "OHLC");
  trackResult(technicalsResult, "Technicals");
  trackResult(fundamentalsResult, "Fundamentals");
  trackResult(sentimentResult, "Sentiment");
  trackResult(optionsResult, "Options");

  const defaultQuote: PriceQuote = {
    symbol: upperSymbol,
    price: 100,
    change: 0,
    changePercent: 0,
    open: 100,
    high: 101,
    low: 99,
    previousClose: 100,
    volume: 1000000,
    timestamp: Date.now(),
  };

  const quote = quoteResult.data || defaultQuote;
  const ohlc = ohlcResult.data || [];
  const technicals = technicalsResult.data || {};
  const fundamentals = fundamentalsResult.data || { revenueGrowthYoY: [], epsGrowthYoY: [] };
  const sentiment = sentimentResult.data || {};
  const options = optionsResult.data || {};

  return {
    quote,
    ohlc,
    technicals,
    fundamentals,
    sentiment,
    options,
    meta: {
      providersUsed,
      providersFailed,
      timestamp: Date.now(),
    },
  };
}

export function isProviderAvailable(name: string): boolean {
  switch (name.toLowerCase()) {
    case "twelvedata":
      return twelveDataProvider.isAvailable();
    case "mock":
      return mockProvider.isAvailable();
    default:
      return false;
  }
}

export { twelveDataProvider, mockProvider };
