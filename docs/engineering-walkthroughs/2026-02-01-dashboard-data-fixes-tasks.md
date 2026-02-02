# Task: Implement Fallback Demo Mode

- [x] Research and Design [x]
    - [x] Analyze current failsafe points
    - [x] Design global `isDemoMode` flag propagation
- [x] Backend Implementation [x]
    - [x] Create Failsafe Universe in `stockUniverse.ts`
    - [x] Update `marketContextEngine.ts` for representative values
    - [x] Formalize `isDemoMode` flag in `providerRouter.ts`
    - [x] Ensure `fetchStock.ts` propagates demo state
- [x] Frontend Implementation [x]
    - [x] Add `DemoBanner` component
    - [x] Integrate with `isDemoMode` from API
- [x] Verification [x]
    - [x] Verify automatic activation on missing keys
    - [x] Verify banner appears in UI
    - [x] Verify no empty tiles or $— prices

## NEW: Soft Startup & FMP Removal

- [x] Data Mode & Key Cleanup [x]
    - [x] Create `server/domain/dataMode.ts` for soft detection
    - [x] Remove `FMP_API_KEY` from documentation and scripts
    - [x] Scrub `FMP_API_KEY` from env validation/checks
- [x] Softer Backend Guards [x]
    - [x] Update `stockUniverse.ts` bootstrap logic
    - [x] Update `marketContextEngine.ts` to skip APIs in DEMO mode
    - [x] Update `providerRouter.ts` and `rateLimiter.ts` to be non-blocking
- [x] UI & API Message Updates [x]
    - [x] Update `DemoBanner.tsx` copy
    - [x] Update `routes.ts` error messages
- [x] Final Verification & Debug [x]
    - [x] Verify app renders without any API keys
    - [x] Verify FMP is completely removed
    - [x] Fix missing index data in Demo Mode
    - [x] Fix zeroed bucket counts in Demo Mode by providing high-quality mock data
