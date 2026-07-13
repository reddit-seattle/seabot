import { Database } from "better-sqlite3";
import { Logger } from "../utils/logger";
import db from "./sqlite";

export interface WordTracker {
  id: number;
  word: string;
  last_seen: string; // ISO string
  word_count: number;
  channel_id: string | null;
  user_id: string | null;
}

export class WordTrackerStore {
  private db: Database;

  constructor() {
    this.db = db;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS word_trackers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        word_count INTEGER DEFAULT 1,
        channel_id TEXT,
        user_id TEXT,
        UNIQUE(word)
      );

      CREATE INDEX IF NOT EXISTS idx_word_trackers_word ON word_trackers(word);
      CREATE INDEX IF NOT EXISTS idx_word_trackers_last_seen ON word_trackers(last_seen);
    `);
  }

  getWordTracker(word: string): WordTracker | null {
    try {
      const result = this.db
        .prepare(
          `
        SELECT * FROM word_trackers WHERE word = ?
      `,
        )
        .get(word) as WordTracker | undefined;
      return result ?? null;
    } catch (e) {
      Logger.warn(`WordTrackerStore.getWordTracker("${word}") failed:`, e);
      return null;
    }
  }

  updateWordTracker(
    word: string,
    channelId: string,
    userId: string,
  ): WordTracker | null {
    try {
      const existing = this.getWordTracker(word);

      if (existing) {
        this.db
          .prepare(
            `
          UPDATE word_trackers 
          SET last_seen = CURRENT_TIMESTAMP, 
              word_count = word_count + 1,
              channel_id = ?,
              user_id = ?
          WHERE word = ?
        `,
          )
          .run(channelId, userId, word);

        return {
          ...existing,
          word_count: (existing as any).word_count + 1,
          last_seen: new Date().toISOString(),
        };
      } else {
        this.db
          .prepare(
            `
          INSERT INTO word_trackers (word, channel_id, user_id)
          VALUES (?, ?, ?)
        `,
          )
          .run(word, channelId, userId);

        return this.getWordTracker(word);
      }
    } catch (e) {
      Logger.warn(
        `WordTrackerStore.updateWordTracker("${word}", channel=${channelId}) failed:`,
        e,
      );
      return null;
    }
  }

  getAllWordTrackers(): WordTracker[] {
    try {
      return this.db
        .prepare(
          `
        SELECT * FROM word_trackers ORDER BY last_seen DESC
      `,
        )
        .all() as WordTracker[];
    } catch (e) {
      Logger.warn("WordTrackerStore.getAllWordTrackers() failed:", e);
      return [];
    }
  }

  resetWordTracker(word: string) {
    try {
      return this.db
        .prepare(
          `
        DELETE FROM word_trackers WHERE word = ?
      `,
        )
        .run(word);
    } catch (e) {
      Logger.warn(`WordTrackerStore.resetWordTracker("${word}") failed:`, e);
      return null;
    }
  }
}
