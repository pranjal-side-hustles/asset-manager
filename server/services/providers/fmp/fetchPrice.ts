const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

interface FMPQuoteResponse {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  sharesOutstanding: number;
}

interface FMPProfileResponse {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  mktCap: number;
  price: number;
  changes: number;
  currency: string;
  exchange: string;
}

export interface FMPPriceData {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  industry: string;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  ma50: number;
  ma200: number;
  pe: number;
}

export async function fetchFMPPrice(symbol: string): Promise<FMPPriceData | null> {
  const apiKey = process.env.FMP_API_KEY;
  
  if (!apiKey) {
    console.warn("[FMP] No API key configured");
    return null;
  }

  try {
    const quoteUrl = `${FMP_BASE_URL}/quote/${symbol}?apikey=${apiKey}`;
    const profileUrl = `${FMP_BASE_URL}/profile/${symbol}?apikey=${apiKey}`;
    
    const [quoteRes, profileRes] = await Promise.all([
      fetch(quoteUrl),
      fetch(profileUrl)
    ]);

    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      console.warn(`[FMP] Quote API failed for ${symbol}: ${quoteRes.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const quoteData: FMPQuoteResponse[] = await quoteRes.json();
    const profileData: FMPProfileResponse[] = profileRes.ok ? await profileRes.json() : [];

    if (!quoteData?.[0]) {
      console.warn(`[FMP] No quote data for ${symbol} - response was empty`);
      return null;
    }

    const quote = quoteData[0];
    const profile = profileData?.[0];

    return {
      symbol: quote.symbol,
      companyName: profile?.companyName || quote.name || symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      volume: quote.volume,
      marketCap: quote.marketCap || profile?.mktCap || 0,
      sector: profile?.sector || "Unknown",
      industry: profile?.industry || "Unknown",
      high: quote.dayHigh,
      low: quote.dayLow,
      open: quote.open,
      previousClose: quote.previousClose,
      ma50: quote.priceAvg50,
      ma200: quote.priceAvg200,
      pe: quote.pe,
    };
  } catch (error) {
    console.error(`[FMP] Error fetching price for ${symbol}:`, error);
    return null;
  }
}
