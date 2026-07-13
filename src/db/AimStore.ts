import { Database } from "better-sqlite3";
import db from "./sqlite";

export interface AimLink {
  discord_id: string;
  discord_username: string;
  screen_name: string;
  status: "active" | "banned";
  created_at: string;
}

/**
 * Discord <-> AIM identity mapping
 */
export class AimStore {
  private db: Database;

  constructor() {
    this.db = db;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS aim_links (
        discord_id TEXT PRIMARY KEY,
        discord_username TEXT NOT NULL,
        screen_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_aim_links_screen_name
        ON aim_links(screen_name);
    `);
  }

  getLinkByDiscordId(discordId: string): AimLink | null {
    return (
      (this.db
        .prepare(`SELECT * FROM aim_links WHERE discord_id = ?`)
        .get(discordId) as AimLink | undefined) ?? null
    );
  }

  getLinkByScreenName(screenName: string): AimLink | null {
    return (
      (this.db
        .prepare(`SELECT * FROM aim_links WHERE screen_name = ? COLLATE NOCASE`)
        .get(screenName) as AimLink | undefined) ?? null
    );
  }

  isScreenNameTaken(screenName: string): boolean {
    return this.getLinkByScreenName(screenName) !== null;
  }

  createLink(discordId: string, discordUsername: string, screenName: string) {
    this.db
      .prepare(
        `INSERT INTO aim_links (discord_id, discord_username, screen_name, status)
         VALUES (?, ?, ?, 'active')
         ON CONFLICT(discord_id) DO UPDATE SET
           discord_username = excluded.discord_username,
           screen_name = excluded.screen_name,
           status = 'active'`,
      )
      .run(discordId, discordUsername, screenName);
  }

  setLinkStatus(discordId: string, status: AimLink["status"]) {
    this.db
      .prepare(`UPDATE aim_links SET status = ? WHERE discord_id = ?`)
      .run(status, discordId);
  }

  /** Rows are removed so the screen name returns to the pool. */
  deleteLink(discordId: string) {
    this.db
      .prepare(`DELETE FROM aim_links WHERE discord_id = ?`)
      .run(discordId);
  }
}

export const aimStore = new AimStore();
