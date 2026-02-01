const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

interface FinnhubQuoteResponse {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Percent change
  h: number;   // High price of the day
  l: number;   // Low price of the day
  o: number;   // Open price of the day
  pc: number;  // Previous close price
  t: number;   // Timestamp
}

export interface FinnhubPriceQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export async function fetchFinnhubQuote(
  symbol: string
): Promise<FinnhubPriceQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.warn("[Finnhub] No API key configured");
    return null;
  }

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Finnhub] Quote API failed for ${symbol}: ${response.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const data: FinnhubQuoteResponse = await response.json();

    if (!data.c || data.c === 0) {
      console.warn(`[Finnhub] No quote data for ${symbol} (price is 0 or missing)`);
      return null;
    }

    return {
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      timestamp: data.t * 1000
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching quote for ${symbol}:`, error);
    return null;
  }
}
