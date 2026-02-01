const MARKETSTACK_BASE_URL = "http://api.marketstack.com/v1";

interface MarketstackEOD {
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

interface MarketstackResponse {
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: MarketstackEOD[];
}

export interface MarketstackHistoricalData {
  prices: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export async function fetchMarketstackHistorical(
  symbol: string, 
  days: number = 90
): Promise<MarketstackHistoricalData | null> {
  const apiKey = process.env.MARKETSTACK_API_KEY;
  
  if (!apiKey) {
    console.warn("[Marketstack] No API key configured");
    return null;
  }

  try {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    
    const dateTo = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `${MARKETSTACK_BASE_URL}/eod?access_key=${apiKey}&symbols=${symbol}&date_from=${dateFromStr}&date_to=${dateTo}&limit=100`
    );

    if (!response.ok) {
      console.warn(`[Marketstack] Failed to fetch historical data for ${symbol}`);
      return null;
    }

    const data: MarketstackResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      console.warn(`[Marketstack] No historical data for ${symbol}`);
      return null;
    }

    const prices = data.data.map(d => ({
      date: d.date.split('T')[0],
      open: d.adj_open || d.open,
      high: d.adj_high || d.high,
      low: d.adj_low || d.low,
      close: d.adj_close || d.close,
      volume: d.adj_volume || d.volume
    }));

    return { prices };
  } catch (error) {
    console.error(`[Marketstack] Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}
