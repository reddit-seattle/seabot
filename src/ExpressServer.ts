import express from "express";
import { db } from "./db/SqliteService";

export default class ExpressServer {
  private _server;

  constructor() {
    this._server = express();

    // Health check endpoint for Docker/Azure
    this._server.get("/health", async (request, response) => {
      try {
        // Basic health checks
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || "unknown",
          database: "unknown"
        };

        // Check database connectivity
        try {
          await db.initialize();
          const connector = db.getConnector();
          await connector.getValue("health_check", "ok");
          health.database = "connected";
        } catch (error) {
          health.database = "error";
          health.status = "degraded";
        }

        const statusCode = health.status === "healthy" ? 200 : 503;
        response.status(statusCode).json(health);
      } catch (error) {
        response.status(503).json({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Legacy root endpoint for backward compatibility
    this._server.get("/", (request, response) => {
      response.send("Discord bot active.");
    });
  }

  start() {
    console.log("Starting express server...");
    this._server.listen(8080);
  }
}
