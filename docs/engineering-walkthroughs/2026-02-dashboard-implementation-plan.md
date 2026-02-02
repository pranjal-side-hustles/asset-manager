# Soft Startup & FMP Removal Plan

The goal is to ensure the application never blocks rendering due to missing API keys or provider failures. We will replace hard guards with a soft `DATA_MODE` detection system.

## Proposed Changes

### 1. Centralized Data mode Detection
- **[NEW] [dataMode.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/domain/dataMode.ts)**: Implement `getDataMode()` which returns `LIVE` if `FINNHUB_API_KEY` or `MARKETSTACK_API_KEY` is present, and `DEMO` otherwise.

### 2. Provider & Key Cleanup
- **[MODIFY] [stockUniverse.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/services/stocks/stockUniverse.ts)**: 
    - Ensure `bootstrapUniverse` never throws.
    - Use `getDataMode()` to decide whether to fetch or use the failsafe universe.
- **[MODIFY] [marketContextEngine.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/domain/marketContext/marketContextEngine.ts)**: 
    - Use `getDataMode()`.
    - If in `DEMO` mode, skip API calls entirely and return defaults immediately.
- **[CLEANUP]**: Remove `FMP_API_KEY` references from:
    - Documentation (`RAILWAY_DEPLOYMENT.md`, `README.md`, etc.)
    - Scripts (`diagnose.sh`)
    - Any lingering environment checks.

### 3. Frontend & Banner Updates
- **[MODIFY] [DemoBanner.tsx](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/client/src/components/layout/DemoBanner.tsx)**: Update copy to "Market data is currently unavailable. Showing demo data."
- **[MODIFY] [routes.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/routes.ts)**: Update the fallback/error banner copy in the API response.

### 4. Remove Hard Guards
- **[MODIFY] [rateLimiter.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/services/providers/finnhub/rateLimiter.ts)**: Soften 429 handling; return a status instead of throwing if it might block rendering.
- **[MODIFY] [providerRouter.ts](file:///Users/pranjalpatil/Desktop/Trading%20Ideas/TradeMatrix/asset-manager/asset-manager/server/services/providers/adapter/providerRouter.ts)**: Ensure it gracefully handles the absence of all keys.

## Verification Plan

### Automated Verification
- Run the server without any API keys and verify the dashboard loads with demo data.
- Verify the `/api/dashboard` response includes `isDemoMode: true` and the new `dataWarning` message.

### Manual Verification
- Check the UI for the updated banner text.
- Verify that clicking stocks still shows mock data without crashing or showing API errors.
