import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchStockEvaluation, fetchDashboardStocks } from "./services/stocks/fetchStock";
import { searchStocks } from "./services/stocks/searchStocks";
import { logger, providerGuard, refreshManager } from "./infra";
import { ENGINE_VERSIONS } from "./domain/engineMeta";
import { getMarketContext, getDefaultMarketContextSnapshot } from "./domain/marketContext/marketContextEngine";
import { evaluatePhase3ForSymbol } from "./domain/phase3";
import { evaluatePhase4ForSymbol } from "./domain/phase4";

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
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Return 200 with fallback so UI loads; frontend shows dataWarning
      const fallbackContext = getDefaultMarketContextSnapshot(
        error instanceof Error ? error.message : "Unknown error"
      );
      res.status(200).json({
        stocks: [],
        lastUpdated: Date.now(),
        marketRegime: fallbackContext.context.regime,
        marketConfidence: fallbackContext.context.confidence,
        dataWarning:
          "Unable to load market data. Add FINNHUB_API_KEY, MARKETSTACK_API_KEY, and FMP_API_KEY in Vercel (or Railway) Environment Variables, then redeploy.",
      });
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

  // Phase 3: Confirmation Layer - SEPARATE from Phase 0/1/2
  // Only confirms or rejects Phase 2 decisions
  // Does NOT modify scores
  app.get("/api/phase3/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;

      if (!symbol || typeof symbol !== "string") {
        res.status(400).json({ error: "Invalid symbol" });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const result = await evaluatePhase3ForSymbol(upperSymbol);

      if (!result) {
        res.status(404).json({ error: "Unable to evaluate Phase 3 for symbol" });
        return;
      }

      // Return Phase 3 result with exact fields as specified
      res.json({
        symbol: upperSymbol,
        confirmationScore: result.confirmationScore,
        confirmationLevel: result.confirmationLevel,
        confirmations: result.confirmations,
        blockers: result.blockers,
        meta: {
          maxPossibleScore: result.maxPossibleScore,
          scorePercentage: result.scorePercentage,
          allSignals: result.allSignals,
          evaluatedAt: result.evaluatedAt,
        },
      });
    } catch (error) {
      logger.withContext({ symbol: req.params.symbol }).error(
        "CONFIRMATION",
        "Error evaluating Phase 3",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      res.status(500).json({ error: "Failed to evaluate Phase 3" });
    }
  });

  // Phase 4: Strategy Playbooks - SEPARATE from Phase 0-3
  // Playbooks match conditions; they do not force actions
  // Only one playbook may be active at a time
  app.get("/api/phase4/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;

      if (!symbol || typeof symbol !== "string") {
        res.status(400).json({ error: "Invalid symbol" });
        return;
      }

      const upperSymbol = symbol.toUpperCase();
      const result = await evaluatePhase4ForSymbol(upperSymbol);

      if (!result) {
        res.status(404).json({ error: "Unable to evaluate Phase 4 for symbol" });
        return;
      }

      // Return Phase 4 result with playbook info
      res.json({
        symbol: upperSymbol,
        activePlaybook: result.activePlaybook,
        consideredPlaybooks: result.consideredPlaybooks,
        meta: {
          evaluatedAt: result.evaluatedAt,
        },
      });
    } catch (error) {
      logger.withContext({ symbol: req.params.symbol }).error(
        "CONFIRMATION",
        "Error evaluating Phase 4",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      res.status(500).json({ error: "Failed to evaluate Phase 4" });
    }
  });

  // Playbook Performance Tracking - Aggregate Metrics
  // SURVIVORSHIP BIAS FREE: Shows all instances, not just successful ones
  app.get("/api/playbook-performance/:playbookId", async (req, res) => {
    try {
      const { playbookId } = req.params;

      // Validate playbook ID
      const validPlaybooks = [
        "TREND_CONTINUATION",
        "PULLBACK_ENTRY",
        "BASE_BREAKOUT",
        "MEAN_REVERSION",
        "DEFENSIVE_HOLD",
      ];

      if (!validPlaybooks.includes(playbookId)) {
        res.status(400).json({ error: "Invalid playbook ID" });
        return;
      }

      // Import dynamically to avoid circular deps
      const { computeAggregateMetrics, getStoreStats } = await import("./domain/playbookTracking");
      const { PLAYBOOK_DEFINITIONS } = await import("@shared/types/phase4");
      const { PERFORMANCE_DISCLAIMERS } = await import("@shared/types/playbookTracking");

      const metrics = await computeAggregateMetrics(playbookId as any);
      const stats = getStoreStats();

      if (!metrics) {
        res.json({
          playbookId,
          playbookTitle: PLAYBOOK_DEFINITIONS[playbookId as keyof typeof PLAYBOOK_DEFINITIONS].title,
          metrics: null,
          message: "No instances tracked yet for this playbook",
          storeStats: stats,
          disclaimers: PERFORMANCE_DISCLAIMERS,
        });
        return;
      }

      res.json({
        playbookId,
        playbookTitle: PLAYBOOK_DEFINITIONS[playbookId as keyof typeof PLAYBOOK_DEFINITIONS].title,
        metrics,
        storeStats: stats,
        disclaimers: PERFORMANCE_DISCLAIMERS,
      });

    } catch (error) {
      logger.error(
        "CONFIRMATION",
        "Error fetching playbook performance",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      res.status(500).json({ error: "Failed to fetch playbook performance" });
    }
  });

  // Playbook Performance Summary - All Playbooks
  app.get("/api/playbook-performance", async (req, res) => {
    try {
      const { computeAggregateMetrics, getStoreStats } = await import("./domain/playbookTracking");
      const { PLAYBOOK_DEFINITIONS } = await import("@shared/types/phase4");
      const { PERFORMANCE_DISCLAIMERS } = await import("@shared/types/playbookTracking");

      const playbookIds = Object.keys(PLAYBOOK_DEFINITIONS) as (keyof typeof PLAYBOOK_DEFINITIONS)[];
      const allMetrics = await Promise.all(
        playbookIds.map(async (id) => ({
          playbookId: id,
          playbookTitle: PLAYBOOK_DEFINITIONS[id].title,
          metrics: await computeAggregateMetrics(id),
        }))
      );

      res.json({
        playbooks: allMetrics,
        storeStats: getStoreStats(),
        disclaimers: PERFORMANCE_DISCLAIMERS,
      });

    } catch (error) {
      logger.error(
        "CONFIRMATION",
        "Error fetching playbook performance summary",
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      res.status(500).json({ error: "Failed to fetch playbook performance summary" });
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
