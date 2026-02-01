const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

interface FMPTechnicalIndicator {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma?: number;
  ema?: number;
  rsi?: number;
}

interface FMPHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  change: number;
  changePercent: number;
}

export interface FMPTechnicalsData {
  rsi: number;
  ma20: number;
  ma50: number;
  ma200: number;
  atr: number;
  atrPercent: number;
  currentPrice: number;
  weeklyTrend: "UP" | "DOWN" | "SIDEWAYS";
  dailyTrend: "UP" | "DOWN" | "SIDEWAYS";
}

function calculateATR(prices: FMPHistoricalPrice[], period: number = 14): number {
  if (prices.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 0; i < prices.length - 1 && i < period; i++) {
    const current = prices[i];
    const previous = prices[i + 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }
  
  return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
}

function calculateSMA(prices: FMPHistoricalPrice[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(0, period).reduce((acc, p) => acc + p.close, 0);
  return sum / period;
}

function calculateRSI(prices: FMPHistoricalPrice[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 0; i < period; i++) {
    const change = prices[i].close - prices[i + 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function determineTrend(prices: FMPHistoricalPrice[], period: number): "UP" | "DOWN" | "SIDEWAYS" {
  if (prices.length < period) return "SIDEWAYS";
  
  const recentPrices = prices.slice(0, period);
  const firstPrice = recentPrices[recentPrices.length - 1].close;
  const lastPrice = recentPrices[0].close;
  
  const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (percentChange > 3) return "UP";
  if (percentChange < -3) return "DOWN";
  return "SIDEWAYS";
}

export async function fetchFMPTechnicals(symbol: string): Promise<FMPTechnicalsData | null> {
  const apiKey = process.env.FMP_API_KEY;
  
  if (!apiKey) {
    console.warn("[FMP] No API key configured");
    return null;
  }

  try {
    const response = await fetch(
      `${FMP_BASE_URL}/historical-price-full/${symbol}?apikey=${apiKey}`
    );

    if (!response.ok) {
      console.warn(`[FMP] Failed to fetch historical prices for ${symbol}`);
      return null;
    }

    const data = await response.json();
    const prices: FMPHistoricalPrice[] = data.historical || [];

    if (prices.length < 200) {
      console.warn(`[FMP] Insufficient historical data for ${symbol}`);
      return null;
    }

    const currentPrice = prices[0]?.close || 0;
    const atr = calculateATR(prices);
    const rsi = calculateRSI(prices);
    const ma20 = calculateSMA(prices, 20);
    const ma50 = calculateSMA(prices, 50);
    const ma200 = calculateSMA(prices, 200);

    return {
      rsi,
      ma20,
      ma50,
      ma200,
      atr,
      atrPercent: currentPrice > 0 ? (atr / currentPrice) * 100 : 0,
      currentPrice,
      weeklyTrend: determineTrend(prices, 5),
      dailyTrend: determineTrend(prices, 1),
    };
  } catch (error) {
    console.error(`[FMP] Error fetching technicals for ${symbol}:`, error);
    return null;
  }
}
