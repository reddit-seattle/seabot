import Database from 'better-sqlite3';
import { Message } from 'discord.js';
import ISeabotConfig from '../configuration/ISeabotConfig';

export class SimpleTelemetry {
  private db: Database.Database;
  private config: ISeabotConfig | null = null;

  constructor(dbPath: string = './telemetry.db', config?: ISeabotConfig) {
    this.db = new Database(dbPath);
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

      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_commands_timestamp ON commands(timestamp);
    `);
  }

  // Log a message
  logMessage(message: Message) {
    try {
      // Get category_id safely - only certain guild channels have parentId
      const categoryId = message.channel.isDMBased() 
        ? null 
        : 'parentId' in message.channel 
          ? message.channel.parentId 
          : null;

      // Check if we should emit this message
      if (this.config?.telemetryCategories && this.config.telemetryCategories.length > 0) {
        if (!categoryId || !this.config.telemetryCategories.includes(categoryId)) {
          return; // Skip emitting this message
        }
      }

      this.db.prepare(`
        INSERT INTO messages (channel_id, category_id, message_length)
        VALUES (?, ?, ?)
      `).run(
        message.channelId,
        categoryId,
        message.content.length
      );
    } catch (e) {
      // Silent fail - don't break the bot
      console.warn('Telemetry log failed:', e);
    }
  }

  // Log a command
  logCommand(channelId: string, commandName: string, success: boolean, subcommand?: string) {
    try {
      this.db.prepare(`
        INSERT INTO commands (channel_id, command_name, subcommand, success)
        VALUES (?, ?, ?, ?)
      `).run(channelId, commandName, subcommand || null, success ? 1 : 0);
    } catch (e) {
      console.warn('Command log failed:', e);
    }
  }

  // Simple metrics
  getMetrics(timeRange: string = '7d') {
    const timeFilter = timeRange === '24h' ? '-1 day' : '-7 days';
    // Daily message counts by week
    const messageStats = this.db.prepare(`
      SELECT DATE(timestamp, 'localtime') as date, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY DATE(timestamp, 'localtime')
      ORDER BY date
    `).all(timeFilter);

    // Hourly message counts by day
    const hourlyMessages = this.db.prepare(`
      SELECT strftime('%H', timestamp, 'localtime') as hour, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', '-1 day', 'localtime')
      GROUP BY strftime('%H', timestamp, 'localtime')
      ORDER BY hour
    `).all();

    // Channel activity (top 10 most active channels)
    const channelActivity = this.db.prepare(`
      SELECT channel_id, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY channel_id 
      ORDER BY count DESC 
      LIMIT 10
    `).all(timeFilter);    // Messages per 15 minutes over selected time range (time series)
    const timeSeriesHourly = this.db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:', timestamp, 'localtime') || 
        printf('%02d', (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 15) * 15) || 
        ':00' as time,
        COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY strftime('%Y-%m-%d %H', timestamp, 'localtime'), (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 15)
      ORDER BY time
    `).all(timeFilter);

    // Messages per 15 minutes by channel (for colored line chart)
    const timeSeriesByChannel = this.db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:', timestamp, 'localtime') || 
        printf('%02d', (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 15) * 15) || 
        ':00' as time,
        channel_id,
        COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY strftime('%Y-%m-%d %H', timestamp, 'localtime'), (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 15), channel_id
      ORDER BY time, channel_id
    `).all(timeFilter);

    // Command usage statistics
    const commandStats = this.db.prepare(`
      SELECT 
        command_name,
        subcommand,
        COUNT(*) as count,
        CASE WHEN subcommand IS NOT NULL THEN command_name || '/' || subcommand 
             ELSE command_name END as full_command
      FROM commands 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY command_name, subcommand
      ORDER BY count DESC
    `).all(timeFilter);

    // Command success rate
    const commandSuccess = this.db.prepare(`
      SELECT 
        DATE(timestamp, 'localtime') as date,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM commands 
      WHERE timestamp > datetime('now', ?, 'localtime')
      GROUP BY DATE(timestamp, 'localtime')
      ORDER BY date
    `).all(timeFilter);

    // Category activity
    const categoryStats = this.db.prepare(`
      SELECT category_id, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', ?, 'localtime')
        AND category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY count DESC
    `).all(timeFilter);

    return { 
      messageStats,
      hourlyMessages,
      channelActivity,
      timeSeriesHourly,
      timeSeriesByChannel,
      commandStats, 
      commandSuccess,
      categoryStats 
    };
  }

  close() {
    this.db.close();
  }
}
