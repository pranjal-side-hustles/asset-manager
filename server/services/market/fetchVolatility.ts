import { TrendDirection } from "../../../shared/types/marketContext";
import { fetchWithRetry } from "../../infra/network/fetchWithRetry";
import { providerGuard } from "../../infra/network/providerGuard";
import { logger } from "../../infra/logging/logger";

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface VolatilityData {
  vixLevel: number;
  vixTrend: TrendDirection;
  isElevated: boolean;
}

export async function fetchVIX(): Promise<{
  volatility: VolatilityData;
  success: boolean;
}> {
  if (!FINNHUB_API_KEY || !providerGuard.isAvailable("Finnhub")) {
    return {
      volatility: createDefaultVolatility(),
      success: false,
    };
  }

  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=VIX&token=${FINNHUB_API_KEY}`;
    const response = await fetchWithRetry(url, {}, { timeoutMs: 6000 });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.c || data.c === 0) {
      const uvxyUrl = `https://finnhub.io/api/v1/quote?symbol=UVXY&token=${FINNHUB_API_KEY}`;
      const uvxyResponse = await fetchWithRetry(uvxyUrl, {}, { timeoutMs: 6000 });
      
      if (uvxyResponse.ok) {
        const uvxyData = await uvxyResponse.json();
        if (uvxyData.dp) {
          const estimatedVix = uvxyData.dp > 5 ? 25 : uvxyData.dp > 0 ? 18 : 15;
          return {
            volatility: {
              vixLevel: estimatedVix,
              vixTrend: uvxyData.dp > 3 ? "UP" : uvxyData.dp < -3 ? "DOWN" : "SIDEWAYS",
              isElevated: estimatedVix > 20,
            },
            success: true,
          };
        }
      }
      
      return {
        volatility: createDefaultVolatility(),
        success: false,
      };
    }

    providerGuard.recordSuccess("Finnhub");

    const vixLevel = data.c;
    const vixChange = data.dp || 0;
    
    let vixTrend: TrendDirection = "SIDEWAYS";
    if (vixChange > 5) vixTrend = "UP";
    else if (vixChange < -5) vixTrend = "DOWN";

    const isElevated = vixLevel > 20;

    logger.dataFetch(`VIX: ${vixLevel.toFixed(2)}, change: ${vixChange.toFixed(2)}%, elevated: ${isElevated}`);

    return {
      volatility: {
        vixLevel,
        vixTrend,
        isElevated,
      },
      success: true,
    };
  } catch (error) {
    providerGuard.recordFailure("Finnhub");
    logger.providerFailure(`Failed to fetch VIX: ${error}`);
    
    return {
      volatility: createDefaultVolatility(),
      success: false,
    };
  }
}

function createDefaultVolatility(): VolatilityData {
  return {
    vixLevel: 18,
    vixTrend: "SIDEWAYS",
    isElevated: false,
  };
}
