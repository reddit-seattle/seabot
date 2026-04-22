import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import ISeabotConfig from "./configuration/ISeabotConfig";
import { telemetry } from "./db";
import DiscordBot from "./discord/DiscordBot";
import { Environment } from "./utils/constants";
import { formatUptime } from "./utils/helpers";
import { Logger } from "./utils/logger";

export default class ExpressServer {
  private _server;
  private _startTime: Date;
  private _telemetry: typeof telemetry | null = null;
  private _discordBot: DiscordBot | null = null;
  private _metricsCache = new Map<
    string,
    { data: any; timestamp: number }
  >();
  private readonly CACHE_DURATION = 8000; // 8 seconds cache for live updates
  private readonly ALLOWED_TIME_RANGES = new Set(["24h", "7d"]);

  // Rate limiting for endpoint
  private readonly rateLimiter = rateLimit({
    windowMs: 30 * 1000, // 30 seconds window
    max: 10, // 10 requests per window per IP
    message: { error: "Too many requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  constructor(config?: ISeabotConfig) {
    this._server = express();
    this._startTime = new Date();

    // Initialize telemetry
    try {
      const dbPath =
        process.env.NODE_ENV === "production"
          ? Environment.telemetryDbPath
          : "./telemetry.db";
      Logger.info(
        `Attempting to initialize telemetry with database path: ${dbPath}`,
      );

      // Check if the directory exists
      const dbDir = path.dirname(dbPath);
      Logger.info(`Database directory: ${dbDir}`);
      Logger.info(`Database directory exists: ${fs.existsSync(dbDir)}`);

      if (process.env.NODE_ENV === "production") {
        // In production, log more details about the mount directory
        Logger.info(`Current working directory: ${process.cwd()}`);
        Logger.info(`__dirname: ${__dirname}`);

        // Check the mount point specifically
        if (fs.existsSync("/mnt/telemetry")) {
          const mountContents = fs.readdirSync("/mnt/telemetry");
          Logger.info(
            `Contents of /mnt/telemetry directory: ${JSON.stringify(
              mountContents,
            )}`,
          );
        } else {
          Logger.warn(`/mnt/telemetry mount point does not exist`);
        }
      }

      this._telemetry = telemetry;
      Logger.info("Telemetry initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize telemetry:", error);
    }

    // TODO - make this a badass web page
    this._server.get("/", this.rateLimiter, (_request, response) => {
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
        status: "vibin",
      };

      response.json(buildInfo);
    });

    // Health check endpoint for Docker/monitoring
    this._server.get("/health", (_request, response) => {
      const mem = process.memoryUsage();
      response.json({
        status: "ok",
        uptime: process.uptime(),
        memory: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        },
        discord: this._discordBot?.client?.isReady() ?? false,
      });
    });

    // Metrics endpoint - cached
    this._server.get(
      "/metrics",
      this.rateLimiter,
      async (request, response) => {
        try {
          if (!this._telemetry) {
            return response
              .status(503)
              .json({ "sorry mario": "your telemetry is in another castle" });
          }

          // Normalize time range to a small allowlist to avoid cache key explosion
          const requestedRange = (request.query.range as string) || "24h";
          const timeRange = this.ALLOWED_TIME_RANGES.has(requestedRange)
            ? requestedRange
            : "24h";
          const now = Date.now();

          // Check per-range cache
          const cached = this._metricsCache.get(timeRange);
          if (cached && now - cached.timestamp < this.CACHE_DURATION) {
            Logger.debug(`Serving cached metrics for ${timeRange}`);
            return response.json(cached.data);
          }

          // Get fresh metrics with time range
          const metrics = this._telemetry.getMetrics(timeRange);

          // Enrich with channel names if Discord bot is available
          if (this._discordBot) {
            await this._enrichWithChannelNames(metrics);
          }

          // Cache the result for this time range
          this._metricsCache.set(timeRange, {
            data: metrics,
            timestamp: now,
          });

          Logger.debug("Serving fresh metrics");
          response.json(metrics);
        } catch (error) {
          Logger.error("Error fetching metrics:", error);
          response.status(500).json({
            error: "Failed to fetch metrics",
            details: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    );

    // Serve static dashboard
    this._server.use(
      "/dashboard",
      express.static(path.join(__dirname, "dashboard")),
    );
  }

  getTelemetry(): typeof telemetry | null {
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
      // Collect all unique channel IDs upfront
      const channelIds = new Set<string>();
      if (metrics.channelActivity) {
        for (const d of metrics.channelActivity) channelIds.add(d.channel_id);
      }
      if (metrics.timeSeriesByChannel) {
        for (const d of metrics.timeSeriesByChannel) channelIds.add(d.channel_id);
      }

      // Batch-resolve channel names in parallel
      const channelNamesCache = new Map<string, string>();
      const channelResults = await Promise.allSettled(
        [...channelIds].map(async (id) => {
          const channel = await this._discordBot!.client.channels
            .fetch(id)
            .catch(() => null);
          if (channel && "name" in channel && channel.name) {
            channelNamesCache.set(id, channel.name);
          }
        }),
      );

      // Apply channel names
      if (metrics.channelActivity) {
        for (const channelData of metrics.channelActivity) {
          const name = channelNamesCache.get(channelData.channel_id);
          if (name) channelData.channel_name = name;
        }
      }

      if (metrics.timeSeriesByChannel) {
        for (const timeData of metrics.timeSeriesByChannel) {
          const name = channelNamesCache.get(timeData.channel_id);
          if (name) timeData.channel_name = name;
        }
      }

      // Enrich role ping data with role names
      if (metrics.rolePings) {
        const roleNamesCache = new Map<string, string>();
        const guild = this._discordBot.client.guilds.cache.first();

        if (guild) {
          // Collect all unique role IDs
          const roleIds = new Set<string>();
          for (const rolePingData of metrics.rolePings) {
            const roleEntries = rolePingData.role_data.split("|");
            for (const roleEntry of roleEntries) {
              const [roleId] = roleEntry.split(":");
              roleIds.add(roleId);
            }
          }

          // Batch-resolve role names in parallel
          await Promise.allSettled(
            [...roleIds].map(async (roleId) => {
              const role = await guild.roles.fetch(roleId).catch(() => null);
              if (role) roleNamesCache.set(roleId, role.name);
            }),
          );
        }

        for (const rolePingData of metrics.rolePings) {
          const roleEntries = rolePingData.role_data.split("|");
          const enrichedRoles = [];

          for (const roleEntry of roleEntries) {
            const [roleId, count] = roleEntry.split(":");
            const roleName =
              roleNamesCache.get(roleId) || `Role ${roleId.slice(-4)}`;
            enrichedRoles.push({
              role_id: roleId,
              role_name: roleName,
              count: parseInt(count),
            });
          }

          rolePingData.roles = enrichedRoles;
          rolePingData.count = rolePingData.total_count;
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
