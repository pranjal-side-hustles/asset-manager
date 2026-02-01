import { SectorState, SectorTrend } from "../../../shared/types/marketContext";
import { fetchWithRetry } from "../../infra/network/fetchWithRetry";
import { providerGuard } from "../../infra/network/providerGuard";
import { logger } from "../../infra/logging/logger";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

interface SectorConfig {
  name: string;
  symbol: string;
}

const SECTOR_ETFS: SectorConfig[] = [
  { name: "Technology", symbol: "XLK" },
  { name: "Financials", symbol: "XLF" },
  { name: "Energy", symbol: "XLE" },
  { name: "Healthcare", symbol: "XLV" },
  { name: "Consumer Discretionary", symbol: "XLY" },
  { name: "Industrials", symbol: "XLI" },
  { name: "Materials", symbol: "XLB" },
  { name: "Utilities", symbol: "XLU" },
  { name: "Real Estate", symbol: "XLRE" },
  { name: "Communication Services", symbol: "XLC" },
  { name: "Consumer Staples", symbol: "XLP" },
];

interface SectorQuote {
  price: number;
  changePercent: number;
}

async function fetchSectorQuote(symbol: string): Promise<SectorQuote | null> {
  if (!FINNHUB_API_KEY || !providerGuard.isAvailable("Finnhub")) {
    return null;
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 6000 });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.c || data.c === 0) return null;

    return {
      price: data.c,
      changePercent: data.dp || 0,
    };
  } catch {
    return null;
  }
}

function calculateRelativeStrength(sectorChange: number, spyChange: number): number {
  const rs = sectorChange - spyChange;
  return Math.round(rs * 100) / 100;
}

function determineSectorTrend(relativeStrength: number, changePercent: number): SectorTrend {
  if (relativeStrength > 0.5 && changePercent > 0) return "LEADING";
  if (relativeStrength < -0.5 && changePercent < 0) return "LAGGING";
  return "NEUTRAL";
}

export async function fetchSectorPerformance(spyChangePercent: number = 0): Promise<{
  sectors: SectorState[];
  providersUsed: string[];
  providersFailed: string[];
}> {
  const providersUsed: string[] = [];
  const providersFailed: string[] = [];

  const results = await Promise.all(
    SECTOR_ETFS.map(async (sector) => {
      const quote = await fetchSectorQuote(sector.symbol);
      
      if (!quote) {
        providersFailed.push(`Finnhub-${sector.symbol}`);
        return null;
      }

      providersUsed.push(`Finnhub-${sector.symbol}`);
      
      const relativeStrength = calculateRelativeStrength(quote.changePercent, spyChangePercent);
      const trend = determineSectorTrend(relativeStrength, quote.changePercent);

      return {
        name: sector.name,
        symbol: sector.symbol,
        trend,
        relativeStrength,
        changePercent: quote.changePercent,
      } as SectorState;
    })
  );

  const validSectors = results.filter((r): r is SectorState => r !== null);

  if (validSectors.length > 0) {
    providerGuard.recordSuccess("Finnhub");
    
    validSectors.sort((a, b) => b.relativeStrength - a.relativeStrength);
  }

  logger.dataFetch(`Fetched ${validSectors.length}/${SECTOR_ETFS.length} sectors`, {
    leading: validSectors.filter((s) => s.trend === "LEADING").length,
    lagging: validSectors.filter((s) => s.trend === "LAGGING").length,
  });

  return {
    sectors: validSectors,
    providersUsed,
    providersFailed,
  };
}

export function createDefaultSectors(): SectorState[] {
  return SECTOR_ETFS.map((sector) => ({
    name: sector.name,
    symbol: sector.symbol,
    trend: "NEUTRAL" as SectorTrend,
    relativeStrength: 0,
    changePercent: 0,
  }));
}
