import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchStockEvaluation, fetchDashboardStocks } from "./services/stocks/fetchStock";
import { searchStocks } from "./services/stocks/searchStocks";
import { logger, providerGuard, refreshManager } from "./infra";
import { ENGINE_VERSIONS } from "./domain/engineMeta";
import { getMarketContext } from "./domain/marketContext/marketContextEngine";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/dashboard", async (req, res) => {
    try {
      const [stocks, marketContext] = await Promise.all([
        fetchDashboardStocks(),
        getMarketContext(false),
      ]);
      res.json({
        stocks,
        lastUpdated: Date.now(),
        marketRegime: marketContext.context.regime,
        marketConfidence: marketContext.context.confidence,
      });
    } catch (error) {
      logger.error("DATA_FETCH", "Error fetching dashboard data", { 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/stocks/search", async (req, res) => {
    try {
      const query = req.query.q;
      
      if (!query || typeof query !== "string") {
        res.json({ results: [] });
        return;
      }
      
      const results = await searchStocks(query);
      res.json({ results });
    } catch (error) {
      logger.error("DATA_FETCH", "Error searching stocks", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({ error: "Failed to search stocks" });
    }
  });

  app.get("/api/stocks/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      if (!symbol || typeof symbol !== "string") {
        res.status(400).json({ error: "Invalid symbol" });
        return;
      }
      
      const evaluation = await fetchStockEvaluation(symbol);
      
      if (!evaluation) {
        res.status(404).json({ error: "Stock not found" });
        return;
      }
      
      res.json(evaluation);
    } catch (error) {
      logger.withContext({ symbol: req.params.symbol }).error(
        "DATA_FETCH", 
        "Error fetching stock evaluation",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      res.status(500).json({ error: "Failed to fetch stock evaluation" });
    }
  });

  app.get("/api/market-context", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const snapshot = await getMarketContext(forceRefresh);
      res.json(snapshot);
    } catch (error) {
      logger.error("DATA_FETCH", "Error fetching market context", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(500).json({ error: "Failed to fetch market context" });
    }
  });

  app.get("/api/infra/health", async (req, res) => {
    try {
      const providerHealth = providerGuard.getAllHealth();
      const schedulerStatus = refreshManager.getStatus();
      const recentLogs = logger.getRecentLogs(20);
      
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        engines: ENGINE_VERSIONS,
        providers: providerHealth,
        scheduler: {
          isRunning: schedulerStatus.isRunning,
          taskCount: schedulerStatus.taskCount,
        },
        recentActivity: recentLogs.slice(-10).map(log => ({
          timestamp: log.timestamp,
          type: log.type,
          severity: log.severity,
          message: log.message,
          symbol: log.symbol,
        })),
      });
    } catch (error) {
      res.status(500).json({ 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/infra/logs", async (req, res) => {
    try {
      const { symbol, type, count = "50" } = req.query;
      
      let logs;
      if (symbol && typeof symbol === "string") {
        logs = logger.getLogsBySymbol(symbol, parseInt(count as string));
      } else if (type && typeof type === "string") {
        logs = logger.getLogsByType(type as any, parseInt(count as string));
      } else {
        logs = logger.getRecentLogs(parseInt(count as string));
      }
      
      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  return httpServer;
}
