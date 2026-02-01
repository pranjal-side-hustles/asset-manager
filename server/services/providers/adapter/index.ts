export * from "./types";
export { 
  getMarketData, 
  getEODPrice,
  isProviderAvailable,
  clearAllCaches,
  getProviderCacheStats,
  mockProvider,
  type AggregatedMarketData,
  type EODPrice,
  type EODPriceResult,
} from "./providerRouter";
export { MockProvider, mockProvider as mockDataProvider } from "./mockProvider";
