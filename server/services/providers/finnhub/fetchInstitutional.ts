import { rateLimitedFetch } from "./rateLimiter";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

interface FinnhubOwnership {
  symbol: string;
  ownership: Array<{
    name: string;
    share: number;
    change: number;
    filingDate: string;
  }>;
}

interface FinnhubFundOwnership {
  symbol: string;
  ownership: Array<{
    name: string;
    share: number;
    change: number;
    filingDate: string;
  }>;
}

export interface FinnhubInstitutionalData {
  institutionalOwnership?: number;
  institutionalTrend: "INCREASING" | "FLAT" | "DECREASING";
  topHolders: string[];
}

export async function fetchFinnhubInstitutional(symbol: string): Promise<FinnhubInstitutionalData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.warn("[Finnhub] No API key configured");
    return null;
  }

  try {
    // Sequential calls with rate limiting to avoid hitting API limits
    const ownershipRes = await rateLimitedFetch(`${FINNHUB_BASE_URL}/stock/ownership?symbol=${symbol}&limit=10&token=${apiKey}`);
    const fundRes = await rateLimitedFetch(`${FINNHUB_BASE_URL}/stock/fund-ownership?symbol=${symbol}&limit=10&token=${apiKey}`);

    let institutionalTrend: "INCREASING" | "FLAT" | "DECREASING" = "FLAT";
    let topHolders: string[] = [];
    let totalOwnership = 0;

    if (ownershipRes.ok) {
      const ownershipData: FinnhubOwnership = await ownershipRes.json();
      const owners = ownershipData.ownership || [];
      
      if (owners.length > 0) {
        topHolders = owners.slice(0, 5).map(o => o.name);
        
        const totalChange = owners.reduce((acc, o) => acc + (o.change || 0), 0);
        if (totalChange > 0) {
          institutionalTrend = "INCREASING";
        } else if (totalChange < 0) {
          institutionalTrend = "DECREASING";
        }
      }
    }

    if (fundRes.ok) {
      const fundData: FinnhubFundOwnership = await fundRes.json();
      const funds = fundData.ownership || [];
      
      if (funds.length > 0) {
        totalOwnership = funds.reduce((acc, f) => acc + (f.share || 0), 0);
        
        if (topHolders.length === 0) {
          topHolders = funds.slice(0, 5).map(f => f.name);
        }
        
        const fundChange = funds.reduce((acc, f) => acc + (f.change || 0), 0);
        if (institutionalTrend === "FLAT") {
          if (fundChange > 0) {
            institutionalTrend = "INCREASING";
          } else if (fundChange < 0) {
            institutionalTrend = "DECREASING";
          }
        }
      }
    }

    return {
      institutionalOwnership: totalOwnership > 0 ? totalOwnership : undefined,
      institutionalTrend,
      topHolders
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching institutional data for ${symbol}:`, error);
    return null;
  }
}
