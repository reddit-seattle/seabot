import Database from 'better-sqlite3';
import { Message } from 'discord.js';

export class SimpleTelemetry {
  private db: Database.Database;

  constructor(dbPath: string = './telemetry.db') {
    this.db = new Database(dbPath);
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
      this.db.prepare(`
        INSERT INTO messages (channel_id, category_id, message_length)
        VALUES (?, ?, ?)
      `).run(
        message.channelId,
        message.channel.isDMBased() ? null : (message.channel as any).parentId,
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
  getMetrics() {
    // Daily message counts by week
    const messageStats = this.db.prepare(`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    // Hourly message counts by day
    const hourlyMessages = this.db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', '-1 day')
      GROUP BY strftime('%H', timestamp)
      ORDER BY hour
    `).all();

    // Weekly command usage
    const commandStats = this.db.prepare(`
      SELECT 
        command_name,
        subcommand,
        COUNT(*) as count,
        CASE WHEN subcommand IS NOT NULL THEN command_name || '/' || subcommand 
             ELSE command_name END as full_command
      FROM commands 
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY command_name, subcommand
      ORDER BY count DESC
    `).all();

    // Command success rate
    const commandSuccess = this.db.prepare(`
      SELECT 
        DATE(timestamp) as date,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM commands 
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    // Weekly category activity
    const categoryStats = this.db.prepare(`
      SELECT category_id, COUNT(*) as count
      FROM messages 
      WHERE timestamp > datetime('now', '-7 days')
        AND category_id IS NOT NULL
      GROUP BY category_id
      ORDER BY count DESC
    `).all();

    return { 
      messageStats, 
      hourlyMessages,
      commandStats, 
      commandSuccess,
      categoryStats 
    };
  }

  close() {
    this.db.close();
  }
}
