import { Database } from "better-sqlite3";
import db from "./sqlite";

export interface QuoteChannel {
  id: number;
  channel_id: string;
  chance: number;
  mode: "random" | "claude" | "gemini";
  enabled_at: string;
}

export class QuoteChannelStore {
  private db: Database;

  constructor() {
    this.db = db;
    this.init();
  }

  private init() {
    this.db.exec(`
      DROP TABLE IF EXISTS quote_channels;
      CREATE TABLE IF NOT EXISTS quote_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL UNIQUE,
        chance REAL NOT NULL,
        mode TEXT NOT NULL DEFAULT 'random',
        enabled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (chance >= 0.001 AND chance <= 1.0),
        CHECK (mode IN ('random', 'claude', 'gemini'))
      );

      CREATE INDEX IF NOT EXISTS idx_quote_channels_channel_id ON quote_channels(channel_id);
    `);
  }

  enableChannel(
    channelId: string,
    chance: number,
    mode: "random" | "claude" | "gemini" = "random",
  ): QuoteChannel | null {
    try {
      if (chance < 0.001 || chance > 1.0) {
        console.warn("Invalid chance value:", chance);
        return null;
      }

      const existing = this.getChannel(channelId);

      if (existing) {
        this.db
          .prepare(
            `
          UPDATE quote_channels 
          SET chance = ?, mode = ?, enabled_at = CURRENT_TIMESTAMP
          WHERE channel_id = ?
        `,
          )
          .run(chance, mode, channelId);
      } else {
        this.db
          .prepare(
            `
          INSERT INTO quote_channels (channel_id, chance, mode)
          VALUES (?, ?, ?)
        `,
          )
          .run(channelId, chance, mode);
      }

      return this.getChannel(channelId);
    } catch (e) {
      console.warn("Failed to enable quote channel:", e);
      return null;
    }
  }

  disableChannel(channelId: string): boolean {
    try {
      const result = this.db
        .prepare(
          `
        DELETE FROM quote_channels WHERE channel_id = ?
      `,
        )
        .run(channelId);

      return (result.changes ?? 0) > 0;
    } catch (e) {
      console.warn("Failed to disable quote channel:", e);
      return false;
    }
  }

  getChannel(channelId: string): QuoteChannel | null {
    try {
      const result = this.db
        .prepare(
          `
        SELECT * FROM quote_channels WHERE channel_id = ?
      `,
        )
        .get(channelId) as QuoteChannel | undefined;
      return result ?? null;
    } catch (e) {
      console.warn("Failed to get quote channel:", e);
      return null;
    }
  }

  getAllChannels(): QuoteChannel[] {
    try {
      return this.db
        .prepare(
          `
        SELECT * FROM quote_channels ORDER BY enabled_at DESC
      `,
        )
        .all() as QuoteChannel[];
    } catch (e) {
      console.warn("Failed to get all quote channels:", e);
      return [];
    }
  }

  isChannelEnabled(channelId: string): boolean {
    return this.getChannel(channelId) !== null;
  }

  getChannelChance(channelId: string): number | null {
    const channel = this.getChannel(channelId);
    return channel?.chance ?? null;
  }

  getChannelMode(channelId: string): "random" | "claude" | "gemini" | null {
    const channel = this.getChannel(channelId);
    return channel?.mode ?? null;
  }
}
