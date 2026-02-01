import { logger } from "../../../infra/logging/logger";
import * as fs from "fs";
import * as path from "path";

const MARKETSTACK_BASE_URL = "https://api.marketstack.com/v1";
const CACHE_DIR = path.join(process.cwd(), ".cache", "marketstack");

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
  pagination?: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
  data: MarketstackEOD[];
  error?: {
    code: string;
    message: string;
  };
}

export interface EODData {
  symbol: string;
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
}

export interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketstackEODResult {
  success: boolean;
  data: {
    eod: EODData;
    ohlc: OHLCData[];
  } | null;
  error?: string;
  cached: boolean;
}

interface CacheEntry {
  data: {
    eod: EODData;
    ohlc: OHLCData[];
  };
  cacheDate: string;
  symbol: string;
  fetchedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getTradingDate(): string {
  const now = new Date();
  const day = now.getDay();
  
  if (day === 0) {
    now.setDate(now.getDate() - 2);
  } else if (day === 6) {
    now.setDate(now.getDate() - 1);
  }
  
  return now.toISOString().split('T')[0];
}

function getCacheKey(symbol: string, date: string): string {
  return `${symbol.toUpperCase()}_${date}`;
}

function getCacheFilePath(symbol: string, date: string): string {
  return path.join(CACHE_DIR, `${symbol.toUpperCase()}_${date}.json`);
}

function getFromCache(symbol: string): CacheEntry | null {
  const todayDate = getTradingDate();
  const cacheKey = getCacheKey(symbol, todayDate);
  
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry) {
    logger.withContext({ symbol }).info("CACHE_HIT", `Using cached EOD data for ${symbol} (${memEntry.cacheDate})`);
    return memEntry;
  }
  
  const filePath = getCacheFilePath(symbol, todayDate);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as CacheEntry;
      memoryCache.set(cacheKey, data);
      logger.withContext({ symbol }).info("CACHE_HIT", `Loaded persisted EOD data for ${symbol} (${data.cacheDate})`);
      return data;
    } catch (e) {
      logger.withContext({ symbol }).warn("CACHE_MISS", `Failed to read cache file for ${symbol}`);
    }
  }
  
  return null;
}

function saveToCache(symbol: string, data: { eod: EODData; ohlc: OHLCData[] }): void {
  const todayDate = getTradingDate();
  const cacheKey = getCacheKey(symbol, todayDate);
  
  const entry: CacheEntry = {
    data,
    cacheDate: todayDate,
    symbol: symbol.toUpperCase(),
    fetchedAt: Date.now(),
  };
  
  memoryCache.set(cacheKey, entry);
  
  try {
    ensureCacheDir();
    const filePath = getCacheFilePath(symbol, todayDate);
    fs.writeFileSync(filePath, JSON.stringify(entry), "utf-8");
    logger.withContext({ symbol }).info("DATA_FETCH", `Persisted EOD data for ${symbol} (${todayDate})`);
  } catch (e) {
    logger.withContext({ symbol }).warn("DATA_FETCH", `Failed to persist cache for ${symbol}`);
  }
}

export function clearCache(): void {
  memoryCache.clear();
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    }
  } catch (e) {
    logger.warn("DATA_FETCH", "Failed to clear persistent cache files");
  }
  logger.info("DATA_FETCH", "Marketstack EOD cache cleared");
}

export function getCacheStats(): { entries: number; symbols: string[] } {
  const symbols = Array.from(memoryCache.values()).map(e => e.symbol);
  return { entries: memoryCache.size, symbols };
}

export function isMarketstackAvailable(): boolean {
  return !!process.env.MARKETSTACK_API_KEY_1;
}

export async function fetchMarketstackEOD(symbol: string): Promise<MarketstackEODResult> {
  const upperSymbol = symbol.toUpperCase();
  const log = logger.withContext({ symbol: upperSymbol, provider: "Marketstack" });

  const cachedEntry = getFromCache(upperSymbol);
  if (cachedEntry) {
    return {
      success: true,
      data: cachedEntry.data,
      cached: true,
    };
  }

  const apiKey = process.env.MARKETSTACK_API_KEY_1;
  
  if (!apiKey) {
    log.providerFailure("MARKETSTACK_API_KEY not configured");
    return {
      success: false,
      data: null,
      error: "Marketstack API key not configured",
      cached: false,
    };
  }

  try {
    const dateTo = new Date().toISOString().split('T')[0];
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 250);
    const dateFromStr = dateFrom.toISOString().split('T')[0];

    const url = `${MARKETSTACK_BASE_URL}/eod?access_key=${apiKey}&symbols=${upperSymbol}&date_from=${dateFromStr}&date_to=${dateTo}&limit=250`;
    
    log.dataFetch(`Fetching EOD data from Marketstack for ${upperSymbol}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429 || errorText.includes('quota') || errorText.includes('limit')) {
        log.providerFailure(`Marketstack quota exceeded for ${upperSymbol}`);
        return {
          success: false,
          data: null,
          error: "Marketstack quota exceeded",
          cached: false,
        };
      }
      
      log.providerFailure(`Marketstack API failed for ${upperSymbol}: ${response.status}`);
      return {
        success: false,
        data: null,
        error: `Marketstack API error: ${response.status}`,
        cached: false,
      };
    }

    const responseData: MarketstackResponse = await response.json();

    if (responseData.error) {
      log.providerFailure(`Marketstack API error for ${upperSymbol}: ${responseData.error.message}`);
      return {
        success: false,
        data: null,
        error: responseData.error.message,
        cached: false,
      };
    }

    if (!responseData.data || responseData.data.length === 0) {
      log.providerFailure(`No EOD data available for ${upperSymbol}`);
      return {
        success: false,
        data: null,
        error: "No EOD data available",
        cached: false,
      };
    }

    const latestEOD = responseData.data[0];
    const previousEOD = responseData.data[1];
    
    const closePrice = latestEOD.adj_close || latestEOD.close;
    const previousClose = previousEOD ? (previousEOD.adj_close || previousEOD.close) : closePrice;
    const change = closePrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    const eod: EODData = {
      symbol: upperSymbol,
      date: latestEOD.date.split('T')[0],
      close: closePrice,
      open: latestEOD.adj_open || latestEOD.open,
      high: latestEOD.adj_high || latestEOD.high,
      low: latestEOD.adj_low || latestEOD.low,
      volume: latestEOD.adj_volume || latestEOD.volume,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
    };

    const ohlc: OHLCData[] = responseData.data.map(d => ({
      date: d.date.split('T')[0],
      open: d.adj_open || d.open,
      high: d.adj_high || d.high,
      low: d.adj_low || d.low,
      close: d.adj_close || d.close,
      volume: d.adj_volume || d.volume,
    }));

    const result = { eod, ohlc };
    saveToCache(upperSymbol, result);

    log.dataFetch(`Fetched ${ohlc.length} days of EOD data for ${upperSymbol}`, {
      latestDate: eod.date,
      close: eod.close,
      apiCallMade: true,
    });

    return {
      success: true,
      data: result,
      cached: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.providerFailure(`Marketstack fetch error for ${upperSymbol}: ${errorMessage}`);
    return {
      success: false,
      data: null,
      error: errorMessage,
      cached: false,
    };
  }
}
