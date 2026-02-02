import { PriceContext } from "@shared/types";

export interface PriceAuthorityRules {
    useMarketstackEOD: boolean;
    useFinnhubIntraday: boolean;
    primaryPriceLabel: string;
    intradayLabel?: string;
    cacheTTL: number; // in seconds
}

export function getAuthorityRules(context: PriceContext): PriceAuthorityRules {
    switch (context) {
        case PriceContext.DASHBOARD:
            return {
                useMarketstackEOD: true,
                useFinnhubIntraday: false,
                primaryPriceLabel: "Last Market Close",
                cacheTTL: 24 * 60 * 60, // 24 hours
            };
        case PriceContext.STOCK_DETAIL:
            return {
                useMarketstackEOD: true,
                useFinnhubIntraday: true,
                primaryPriceLabel: "Last Market Close",
                intradayLabel: "Intraday (estimate)",
                cacheTTL: 5 * 60, // 5 minutes for detail page
            };
        case PriceContext.SEARCH:
            return {
                useMarketstackEOD: false, // For search speed
                useFinnhubIntraday: true,
                primaryPriceLabel: "Latest estimate",
                cacheTTL: 60, // 1 minute for search
            };
        default:
            return {
                useMarketstackEOD: true,
                useFinnhubIntraday: false,
                primaryPriceLabel: "Price",
                cacheTTL: 3600,
            };
    }
}
