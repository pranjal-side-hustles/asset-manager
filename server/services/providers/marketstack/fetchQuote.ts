const MARKETSTACK_BASE_URL = "https://api.marketstack.com/v1";

interface MarketstackEODLatest {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adj_high: number;
  adj_low: number;
  adj_close: number;
  adj_open: number;
  adj_volume: number;
  symbol: string;
  exchange: string;
  date: string;
}

interface MarketstackEODLatestResponse {
  pagination?: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: MarketstackEODLatest[];
  error?: {
    code: string;
    message: string;
  };
}

export interface MarketstackPriceQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
}

export async function fetchMarketstackQuote(
  symbol: string
): Promise<MarketstackPriceQuote | null> {
  const apiKey = process.env.MARKETSTACK_API_KEY;
  
  if (!apiKey) {
    console.warn("[Marketstack] No API key configured");
    return null;
  }

  try {
    const response = await fetch(
      `${MARKETSTACK_BASE_URL}/eod/latest?access_key=${apiKey}&symbols=${symbol}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Marketstack] EOD Latest API failed for ${symbol}: ${response.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const data: MarketstackEODLatestResponse = await response.json();

    if (data.error) {
      console.warn(`[Marketstack] EOD Latest API error for ${symbol}: ${data.error.message}`);
      return null;
    }

    if (!data.data || data.data.length === 0) {
      console.warn(`[Marketstack] No EOD latest data for ${symbol}`);
      return null;
    }

    const eod = data.data[0];

    return {
      symbol: eod.symbol,
      price: eod.adj_close || eod.close,
      open: eod.adj_open || eod.open,
      high: eod.adj_high || eod.high,
      low: eod.adj_low || eod.low,
      volume: eod.adj_volume || eod.volume,
      timestamp: new Date(eod.date).getTime()
    };
  } catch (error) {
    console.error(`[Marketstack] Error fetching EOD latest for ${symbol}:`, error);
    return null;
  }
}
