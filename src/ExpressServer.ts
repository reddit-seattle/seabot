import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { formatUptime } from "./utils/helpers";
import { Logger } from "./utils/logger";
import { SimpleTelemetry } from "./db/SimpleTelemetry";
import DiscordBot from "./discord/DiscordBot";
import ISeabotConfig from "./configuration/ISeabotConfig";
import { Environment } from "./utils/constants";

export default class ExpressServer {
  private _server;
  private _startTime: Date;
  private _telemetry: SimpleTelemetry | null = null;
  private _discordBot: DiscordBot | null = null;
  private _metricsCache: { data: any; timestamp: number; cacheKey?: string } | null = null;
  private readonly CACHE_DURATION = 8000; // 8 seconds cache for live updates

  constructor(config?: ISeabotConfig) {
    this._server = express();
    this._startTime = new Date();

    // Initialize telemetry
    try {
      const dbPath = process.env.NODE_ENV === 'production' ? Environment.telemetryDbPath : './telemetry.db';
      Logger.info(`Attempting to initialize telemetry with database path: ${dbPath}`);
      
      // Check if the directory exists
      const dbDir = path.dirname(dbPath);
      Logger.info(`Database directory: ${dbDir}`);
      Logger.info(`Database directory exists: ${fs.existsSync(dbDir)}`);
      
      if (process.env.NODE_ENV === 'production') {
        // In production, log more details about the mount directory
        Logger.info(`Current working directory: ${process.cwd()}`);
        Logger.info(`__dirname: ${__dirname}`);
        
        // Check the mount point specifically
        if (fs.existsSync('/mnt/telemetry')) {
          const mountContents = fs.readdirSync('/mnt/telemetry');
          Logger.info(`Contents of /mnt/telemetry directory: ${JSON.stringify(mountContents)}`);
        } else {
          Logger.warn(`/mnt/telemetry mount point does not exist`);
        }
      }
      
      this._telemetry = new SimpleTelemetry(dbPath, config);
      Logger.info("Telemetry initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize telemetry:", error);
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

    // Rate limiting for metrics endpoint
    const metricsRateLimit = rateLimit({
      windowMs: 30 * 1000, // 30 seconds window
      max: 10, // 10 requests per window per IP
      message: { error: "Too many requests, please slow down" },
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Metrics endpoint - cached
    this._server.get("/metrics", metricsRateLimit, async (request, response) => {
      try {
        if (!this._telemetry) {
          return response.status(503).json({ "sorry mario": "your telemetry is in another castle" });
        }
        
        // Get time range from query parameter (default to 24h)
        const timeRange = (request.query.range as string) || '24h';
        const now = Date.now();
        const cacheKey = `metrics_${timeRange}`;

        // Check cache first (include time range in cache key)
        if (this._metricsCache && this._metricsCache.cacheKey === cacheKey && (now - this._metricsCache.timestamp < this.CACHE_DURATION)) {
          Logger.debug(`Serving cached metrics for ${timeRange}`);
          return response.json(this._metricsCache.data);
        }

        // Get fresh metrics with time range
        const metrics = this._telemetry.getMetrics(timeRange);

        // Enrich with channel names if Discord bot is available
        if (this._discordBot) {
          await this._enrichWithChannelNames(metrics);
        }

        // Cache the result with time range key
        this._metricsCache = {
          data: metrics,
          timestamp: now,
          cacheKey: cacheKey
        };

        Logger.debug("Serving fresh metrics");
        response.json(metrics);

      } catch (error) {
        Logger.error("Error fetching metrics:", error);
        response.status(500).json({
          error: "Failed to fetch metrics",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Serve static dashboard
    this._server.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
  }

  getTelemetry(): SimpleTelemetry | null {
    return this._telemetry;
  }

  setDiscordBot(discordBot: DiscordBot) {
    this._discordBot = discordBot;
  }

  private async _enrichWithChannelNames(metrics: any) {
    if (!this._discordBot || !this._discordBot.client) {
      return;
    }

    try {
      // Enrich channel activity data
      if (metrics.channelActivity) {
        for (const channelData of metrics.channelActivity) {
          const channel = await this._discordBot.client.channels.fetch(channelData.channel_id).catch(() => null);
          if (channel && 'name' in channel) {
            channelData.channel_name = channel.name;
          }
        }
      }

      // Enrich time series by channel data
      if (metrics.timeSeriesByChannel) {
        const channelNamesCache = new Map<string, string>();

        for (const timeData of metrics.timeSeriesByChannel) {
          if (!channelNamesCache.has(timeData.channel_id)) {
            const channel = await this._discordBot.client.channels.fetch(timeData.channel_id).catch(() => null);
            if (channel && 'name' in channel && channel.name) {
              channelNamesCache.set(timeData.channel_id, channel.name);
            }
          }

          const channelName = channelNamesCache.get(timeData.channel_id);
          if (channelName) {
            timeData.channel_name = channelName;
          }
        }
      }
    } catch (error) {
      Logger.error("Error enriching channel names:", error);
    }
  }

  start() {
    Logger.info("Starting express server...");
    this._server.listen(8080);
  }
}
