const FMP_BASE_URL = "https://financialmodelingprep.com/api/v3";

interface FMPIncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  netIncome: number;
  eps: number;
  epsdiluted: number;
}

interface FMPKeyMetrics {
  date: string;
  symbol: string;
  revenuePerShare: number;
  netIncomePerShare: number;
  peRatio: number;
  priceToBookRatio: number;
  debtToEquity: number;
  freeCashFlowPerShare: number;
  freeCashFlowYield: number;
  enterpriseValue: number;
}

interface FMPRatios {
  dividendYield: number;
  peRatio: number;
  priceToBookRatio: number;
  debtEquityRatio: number;
  freeCashFlowPerShare: number;
}

export interface FMPFinancialsData {
  revenueGrowthYoY: number[];
  epsGrowthYoY: number[];
  peRatio?: number;
  forwardPE?: number;
  priceToBook?: number;
  debtToEquity?: number;
  freeCashFlowYield?: number;
}

function calculateGrowthRates(values: number[]): number[] {
  const growthRates: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const current = values[i];
    const previous = values[i + 1];
    if (previous !== 0) {
      growthRates.push(((current - previous) / Math.abs(previous)) * 100);
    }
  }
  return growthRates;
}

export async function fetchFMPFinancials(symbol: string): Promise<FMPFinancialsData | null> {
  const apiKey = process.env.FMP_API_KEY;
  
  if (!apiKey) {
    console.warn("[FMP] No API key configured");
    return null;
  }

  try {
    const [incomeRes, metricsRes, ratiosRes] = await Promise.all([
      fetch(`${FMP_BASE_URL}/income-statement/${symbol}?limit=5&apikey=${apiKey}`),
      fetch(`${FMP_BASE_URL}/key-metrics/${symbol}?limit=1&apikey=${apiKey}`),
      fetch(`${FMP_BASE_URL}/ratios/${symbol}?limit=1&apikey=${apiKey}`)
    ]);

    const incomeData: FMPIncomeStatement[] = incomeRes.ok ? await incomeRes.json() : [];
    const metricsData: FMPKeyMetrics[] = metricsRes.ok ? await metricsRes.json() : [];
    const ratiosData: FMPRatios[] = ratiosRes.ok ? await ratiosRes.json() : [];

    const revenues = incomeData.map(d => d.revenue);
    const epsValues = incomeData.map(d => d.epsdiluted || d.eps);

    const revenueGrowthYoY = calculateGrowthRates(revenues);
    const epsGrowthYoY = calculateGrowthRates(epsValues);

    const metrics = metricsData[0];
    const ratios = ratiosData[0];

    return {
      revenueGrowthYoY,
      epsGrowthYoY,
      peRatio: metrics?.peRatio || ratios?.peRatio,
      priceToBook: metrics?.priceToBookRatio || ratios?.priceToBookRatio,
      debtToEquity: metrics?.debtToEquity || ratios?.debtEquityRatio,
      freeCashFlowYield: metrics?.freeCashFlowYield,
    };
  } catch (error) {
    console.error(`[FMP] Error fetching financials for ${symbol}:`, error);
    return null;
  }
}
