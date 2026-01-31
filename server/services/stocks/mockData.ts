import type { Stock, StockQuote, DashboardStock } from "@shared/types";

interface MockStockData {
  stock: Stock;
  quote: StockQuote;
}

const MOCK_STOCKS: MockStockData[] = [
  {
    stock: {
      symbol: "AAPL",
      companyName: "Apple Inc.",
      price: 178.72,
      change: 2.34,
      changePercent: 1.33,
      volume: 52340000,
      marketCap: 2780000000000,
      sector: "Technology",
      industry: "Consumer Electronics",
    },
    quote: {
      symbol: "AAPL",
      price: 178.72,
      change: 2.34,
      changePercent: 1.33,
      high: 180.15,
      low: 176.89,
      open: 177.50,
      previousClose: 176.38,
      volume: 52340000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      price: 378.91,
      change: 4.56,
      changePercent: 1.22,
      volume: 24560000,
      marketCap: 2810000000000,
      sector: "Technology",
      industry: "Software - Infrastructure",
    },
    quote: {
      symbol: "MSFT",
      price: 378.91,
      change: 4.56,
      changePercent: 1.22,
      high: 381.20,
      low: 375.43,
      open: 376.00,
      previousClose: 374.35,
      volume: 24560000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "GOOGL",
      companyName: "Alphabet Inc.",
      price: 141.80,
      change: -1.23,
      changePercent: -0.86,
      volume: 18920000,
      marketCap: 1760000000000,
      sector: "Technology",
      industry: "Internet Content & Information",
    },
    quote: {
      symbol: "GOOGL",
      price: 141.80,
      change: -1.23,
      changePercent: -0.86,
      high: 143.50,
      low: 140.90,
      open: 143.00,
      previousClose: 143.03,
      volume: 18920000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "AMZN",
      companyName: "Amazon.com Inc.",
      price: 178.25,
      change: 3.12,
      changePercent: 1.78,
      volume: 38450000,
      marketCap: 1850000000000,
      sector: "Consumer Cyclical",
      industry: "Internet Retail",
    },
    quote: {
      symbol: "AMZN",
      price: 178.25,
      change: 3.12,
      changePercent: 1.78,
      high: 179.80,
      low: 175.60,
      open: 176.00,
      previousClose: 175.13,
      volume: 38450000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "NVDA",
      companyName: "NVIDIA Corporation",
      price: 875.38,
      change: 15.67,
      changePercent: 1.82,
      volume: 42180000,
      marketCap: 2160000000000,
      sector: "Technology",
      industry: "Semiconductors",
    },
    quote: {
      symbol: "NVDA",
      price: 875.38,
      change: 15.67,
      changePercent: 1.82,
      high: 882.50,
      low: 862.30,
      open: 865.00,
      previousClose: 859.71,
      volume: 42180000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "META",
      companyName: "Meta Platforms Inc.",
      price: 505.95,
      change: 8.42,
      changePercent: 1.69,
      volume: 15670000,
      marketCap: 1290000000000,
      sector: "Technology",
      industry: "Internet Content & Information",
    },
    quote: {
      symbol: "META",
      price: 505.95,
      change: 8.42,
      changePercent: 1.69,
      high: 510.20,
      low: 498.30,
      open: 500.00,
      previousClose: 497.53,
      volume: 15670000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "TSLA",
      companyName: "Tesla Inc.",
      price: 248.50,
      change: -5.30,
      changePercent: -2.09,
      volume: 98760000,
      marketCap: 790000000000,
      sector: "Consumer Cyclical",
      industry: "Auto Manufacturers",
    },
    quote: {
      symbol: "TSLA",
      price: 248.50,
      change: -5.30,
      changePercent: -2.09,
      high: 255.80,
      low: 246.10,
      open: 254.00,
      previousClose: 253.80,
      volume: 98760000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "JPM",
      companyName: "JPMorgan Chase & Co.",
      price: 198.45,
      change: 1.89,
      changePercent: 0.96,
      volume: 8340000,
      marketCap: 571000000000,
      sector: "Financial Services",
      industry: "Banks - Diversified",
    },
    quote: {
      symbol: "JPM",
      price: 198.45,
      change: 1.89,
      changePercent: 0.96,
      high: 199.80,
      low: 196.50,
      open: 197.00,
      previousClose: 196.56,
      volume: 8340000,
      timestamp: Date.now(),
    },
  },
  {
    stock: {
      symbol: "V",
      companyName: "Visa Inc.",
      price: 279.30,
      change: 2.15,
      changePercent: 0.78,
      volume: 6120000,
      marketCap: 573000000000,
      sector: "Financial Services",
      industry: "Credit Services",
    },
    quote: {
      symbol: "V",
      price: 279.30,
      change: 2.15,
      changePercent: 0.78,
      high: 280.90,
      low: 277.40,
      open: 278.00,
      previousClose: 277.15,
      volume: 6120000,
      timestamp: Date.now(),
    },
  },
];

export function getMockStock(symbol: string): MockStockData | undefined {
  return MOCK_STOCKS.find((s) => s.stock.symbol === symbol.toUpperCase());
}

export function getAllMockStocks(): MockStockData[] {
  return MOCK_STOCKS;
}

export function createDynamicMockStock(symbol: string): MockStockData {
  const upperSymbol = symbol.toUpperCase();
  const hash = upperSymbol.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const basePrice = 50 + (hash % 400);
  const change = ((hash % 20) - 10) * 0.5;
  const changePercent = (change / basePrice) * 100;
  
  const sectors = ["Technology", "Healthcare", "Financial Services", "Consumer Cyclical", "Energy"];
  const sector = sectors[hash % sectors.length];
  
  return {
    stock: {
      symbol: upperSymbol,
      companyName: `${upperSymbol} Corporation`,
      price: basePrice,
      change,
      changePercent,
      volume: 1000000 + (hash * 50000),
      marketCap: 10000000000 + (hash * 1000000000),
      sector,
      industry: `${sector} Services`,
    },
    quote: {
      symbol: upperSymbol,
      price: basePrice,
      change,
      changePercent,
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      open: basePrice - change * 0.5,
      previousClose: basePrice - change,
      volume: 1000000 + (hash * 50000),
      timestamp: Date.now(),
    },
  };
}
