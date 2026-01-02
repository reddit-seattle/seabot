import { Database } from "better-sqlite3";
import { Message } from "discord.js";
import ISeabotConfig from "../configuration/ISeabotConfig";
import { REGEX } from "../utils/constants";
import db from "./sqlite";

export class TelemetryStore {
  private db: Database;
  private config: ISeabotConfig | null = null;

  constructor(config?: ISeabotConfig) {
    this.db = db;
    this.config = config || null;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        channel_id TEXT,
        category_id TEXT,
        message_length INTEGER
      );

      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        channel_id TEXT,
        command_name TEXT,
        subcommand TEXT,
        success BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS role_pings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        channel_id TEXT,
        role_id TEXT,
        message_id TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp);
      CREATE INDEX IF NOT EXISTS idx_role_pings_timestamp ON role_pings(timestamp);
    `);
  }

  logMessage(message: Message) {
    try {
      const categoryId = message.channel.isDMBased()
        ? null
        : "parentId" in message.channel
          ? message.channel.parentId
          : null;

      if (
        this.config?.telemetryCategories &&
        this.config.telemetryCategories.length > 0
      ) {
        if (
          !categoryId ||
          !this.config.telemetryCategories.includes(categoryId)
        ) {
          return; // Skip emitting this message
        }
      }

      this.db
        .prepare(
          `
        INSERT INTO messages (channel_id, category_id, message_length)
        VALUES (?, ?, ?)
      `,
        )
        .run(message.channelId, categoryId, message.content.length);

      // Track role pings if configured
      this.logRolePings(message);
    } catch (e) {
      console.warn("Telemetry log failed:", e);
    }
  }

  logRolePings(message: Message) {
    try {
      // Only track if we have tracked roles configured
      if (
        !this.config?.trackedRoleIds ||
        this.config.trackedRoleIds.length === 0
      ) {
        return;
      }

      // Find role mentions in the message
      const roleMentions = message.content.match(REGEX.ROLE);
      if (!roleMentions) return;

      // Extract role IDs and check if they're tracked
      for (const mention of roleMentions) {
        const roleId = mention.replace(/<@&(\d+)>/, "$1");
        if (this.config.trackedRoleIds.includes(roleId)) {
          this.db
            .prepare(
              `
            INSERT INTO role_pings (channel_id, role_id, message_id)
            VALUES (?, ?, ?)
          `,
            )
            .run(message.channelId, roleId, message.id);
        }
      }
    } catch (e) {
      console.warn("Role ping log failed:", e);
    }
  }

  logCommand(
    channelId: string,
    commandName: string,
    success: boolean,
    subcommand?: string,
  ) {
    try {
      this.db
        .prepare(
          `
        INSERT INTO commands (channel_id, command_name, subcommand, success)
        VALUES (?, ?, ?, ?)
      `,
        )
        .run(channelId, commandName, subcommand || null, success ? 1 : 0);
    } catch (e) {
      console.warn("Command log failed:", e);
    }
  }

  getMetrics(timeRange: string = "7d") {
    const timeFilter = timeRange === "24h" ? "-1 day" : "-7 days";
    const messageStats = this.db
      .prepare(
        `
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
      GROUP BY DATE(timestamp)
      ORDER BY date
    `,
      )
      .all(timeFilter);

    const hourlyMessages = this.db
      .prepare(
        `
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `,
      )
      .all(timeFilter);

    const channelActivity = this.db
      .prepare(
        `
      SELECT channel_id, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
      GROUP BY channel_id 
      ORDER BY count DESC 
      LIMIT 10
    `,
      )
      .all(timeFilter);

    const timeSeriesHourly = this.db
      .prepare(
        `
      SELECT 
        strftime('%Y-%m-%d %H:', timestamp) || 
        printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 15) * 15) || 
        ':00Z' as time,
        COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
      GROUP BY strftime('%Y-%m-%d %H', timestamp), (CAST(strftime('%M', timestamp) AS INTEGER) / 15)
      ORDER BY time
    `,
      )
      .all(timeFilter);

    const timeSeriesByChannel = this.db
      .prepare(
        `
      SELECT 
        strftime('%Y-%m-%d %H:', timestamp) || 
        printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 15) * 15) || 
        ':00Z' as time,
        channel_id,
        COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
      GROUP BY strftime('%Y-%m-%d %H', timestamp), (CAST(strftime('%M', timestamp) AS INTEGER) / 15), channel_id
      ORDER BY time, channel_id
    `,
      )
      .all(timeFilter);

    const commandStats = this.db
      .prepare(
        `
      SELECT 
        command_name,
        subcommand,
        COUNT(*) as count,
        CASE WHEN subcommand IS NOT NULL THEN command_name || '/' || subcommand 
             ELSE command_name END as full_command
      FROM commands 
      WHERE timestamp > datetime('now', ?)
      GROUP BY command_name, subcommand
      ORDER BY count DESC
    `,
      )
      .all(timeFilter);

    const commandSuccess = this.db
      .prepare(
        `
      SELECT 
        DATE(timestamp) as date,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM commands 
      WHERE timestamp > datetime('now', ?)
      GROUP BY DATE(timestamp)
      ORDER BY date
    `,
      )
      .all(timeFilter);

    const categoryStats = this.db
      .prepare(
        `
      SELECT category_id, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?)
        AND category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY count DESC
    `,
      )
      .all(timeFilter);

    const rolePings = this.db
      .prepare(
        `
      SELECT 
        time,
        GROUP_CONCAT(role_id || ':' || count, '|') as role_data,
        SUM(count) as total_count
      FROM (
        SELECT 
          strftime('%Y-%m-%d %H:', timestamp) || 
          printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / 15) * 15) || 
          ':00Z' as time,
          role_id,
          COUNT(*) as count
        FROM role_pings 
        WHERE timestamp > datetime('now', ?)
        GROUP BY strftime('%Y-%m-%d %H', timestamp), (CAST(strftime('%M', timestamp) AS INTEGER) / 15), role_id
      ) grouped_pings
      GROUP BY time
      ORDER BY time
    `,
      )
      .all(timeFilter);

    return {
      messageStats,
      hourlyMessages,
      channelActivity,
      timeSeriesHourly,
      timeSeriesByChannel,
      commandStats,
      commandSuccess,
      categoryStats,
      rolePings,
    };
  }
}
