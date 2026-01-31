import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchStockEvaluation, fetchDashboardStocks } from "./services/stocks/fetchStock";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/dashboard", async (req, res) => {
    try {
      const stocks = await fetchDashboardStocks();
      res.json({
        stocks,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
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
      console.error("Error fetching stock evaluation:", error);
      res.status(500).json({ error: "Failed to fetch stock evaluation" });
    }
  });

  return httpServer;
}
