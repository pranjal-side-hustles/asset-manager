const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

interface FinnhubSentiment {
  symbol: string;
  year: number;
  month: number;
  change: number;
  mspr: number;
}

interface FinnhubRecommendation {
  symbol: string;
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
}

interface FinnhubPriceTarget {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

export interface FinnhubSentimentData {
  insiderBuying: boolean;
  analystRating: number;
  analystPriceTarget?: number;
  recommendationTrend: {
    buy: number;
    hold: number;
    sell: number;
  };
}

export async function fetchFinnhubSentiment(symbol: string): Promise<FinnhubSentimentData | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  
  if (!apiKey) {
    console.warn("[Finnhub] No API key configured");
    return null;
  }

  try {
    const [sentimentRes, recommendationRes, priceTargetRes] = await Promise.all([
      fetch(`${FINNHUB_BASE_URL}/stock/insider-sentiment?symbol=${symbol}&from=2024-01-01&token=${apiKey}`),
      fetch(`${FINNHUB_BASE_URL}/stock/recommendation?symbol=${symbol}&token=${apiKey}`),
      fetch(`${FINNHUB_BASE_URL}/stock/price-target?symbol=${symbol}&token=${apiKey}`)
    ]);

    let insiderBuying = false;
    if (sentimentRes.ok) {
      const sentimentData = await sentimentRes.json();
      const recentSentiment: FinnhubSentiment[] = sentimentData.data || [];
      if (recentSentiment.length > 0) {
        const avgMspr = recentSentiment.reduce((acc, s) => acc + s.mspr, 0) / recentSentiment.length;
        insiderBuying = avgMspr > 0;
      }
    }

    let analystRating = 3;
    let recommendationTrend = { buy: 0, hold: 0, sell: 0 };
    if (recommendationRes.ok) {
      const recommendations: FinnhubRecommendation[] = await recommendationRes.json();
      if (recommendations.length > 0) {
        const latest = recommendations[0];
        const totalBuy = latest.strongBuy + latest.buy;
        const totalSell = latest.strongSell + latest.sell;
        const total = totalBuy + latest.hold + totalSell;
        
        if (total > 0) {
          analystRating = (totalBuy * 5 + latest.hold * 3 + totalSell * 1) / total;
        }
        
        recommendationTrend = {
          buy: totalBuy,
          hold: latest.hold,
          sell: totalSell
        };
      }
    }

    let analystPriceTarget: number | undefined;
    if (priceTargetRes.ok) {
      const priceTarget: FinnhubPriceTarget = await priceTargetRes.json();
      analystPriceTarget = priceTarget.targetMedian || priceTarget.targetMean;
    }

    return {
      insiderBuying,
      analystRating,
      analystPriceTarget,
      recommendationTrend
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching sentiment for ${symbol}:`, error);
    return null;
  }
}
