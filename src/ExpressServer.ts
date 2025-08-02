import express from "express";
import fs from "fs";
import path from "path";
import { formatUptime } from "./utils/helpers";
import { Logger } from "./utils/logger";
import { SimpleTelemetry } from "./db/SimpleTelemetry";
import { Environment } from "./utils/constants";

export default class ExpressServer {
  private _server;
  private _startTime: Date;
  private _telemetry: SimpleTelemetry | null;

  constructor() {
    this._server = express();
    this._startTime = new Date();
    
    // Only enable telemetry in production
    if (process.env.NODE_ENV === 'production') {
      // Use Azure Files mount for persistence
      this._telemetry = new SimpleTelemetry(Environment.telemetryDbPath);
    } else {
      this._telemetry = null; // No telemetry in dev/local
    }
    // TODO - make this a badass web page
    this._server.get("/", (_request, response) => {
      const uptime = process.uptime();
      const uptimeFormatted = formatUptime(uptime);
      
      // Try to get package.json
      let packageInfo: any = {};
      try {
        const packagePath = path.join(__dirname, "../package.json");
        if (fs.existsSync(packagePath)) {
          packageInfo = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        }
      } catch (error) {
        Logger.warn("Error reading package.json:", error);
      }

      const buildInfo = {
        name: packageInfo.name || "seabot",
        version: packageInfo.version || "unknown",
        description: packageInfo.description || "a bot. in SEA.",
        uptime: uptimeFormatted,
        startedAt: this._startTime.toISOString(),
        lastUpdated: new Date().toISOString(),
        status: "vibin"
      };

      response.json(buildInfo);
    });

    // Simple metrics endpoint for Grafana
    this._server.get("/metrics", (_request, response) => {
      try {
        if (!this._telemetry) {
          response.json({ "sorry mario": "your telemetry is in another castle" });
          return;
        }
        const metrics = this._telemetry.getMetrics();
        response.json(metrics);
      } catch (error) {
        Logger.error("Error getting metrics:", error);
        response.status(500).json({ error: "Failed to get metrics" });
      }
    });
  }

  start() {
    Logger.info("Starting express server...");
    this._server.listen(8080);
  }

  getTelemetry() {
    return this._telemetry;
  }
}
