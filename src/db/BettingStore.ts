import { Database } from "better-sqlite3";
import { Guild } from "discord.js";
import { BettingConstants, Time } from "../utils/constants";
import db from "./sqlite";

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count !== 1 ? "s" : ""}`;
}

export interface BanBet {
  id: number;
  bettor_user_id: string; // User who placed the bet
  target_user_id: string; // User being bet against
  guild_id: string;
  note: string | null; // Optional reason/note
  predicted_days_until_ban: number | null; // Predicted days until ban
  bet_placed_at: string; // ISO timestamp
  target_joined_at: string; // ISO timestamp when target joined
  is_active: boolean; // Whether bet is still active
  is_won: boolean | null;
  days_prediction_correct: boolean | null;
}

export interface BetPoints {
  id: number;
  user_id: string;
  guild_id: string;
  points: number;
}

export class BettingStore {
  private db: Database;

  constructor() {
    this.db = db;
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ban_bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bettor_user_id TEXT NOT NULL,
        target_user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        note TEXT,
        predicted_days_until_ban INTEGER DEFAULT NULL,
        bet_placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        target_joined_at DATETIME NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        is_won BOOLEAN DEFAULT NULL,
        days_prediction_correct BOOLEAN DEFAULT NULL,
        UNIQUE(bettor_user_id, target_user_id, guild_id)
      );

      CREATE TABLE IF NOT EXISTS bet_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        points INTEGER DEFAULT 0,
        UNIQUE(user_id, guild_id)
      );

      CREATE INDEX IF NOT EXISTS idx_ban_bets_target ON ban_bets(target_user_id, guild_id);
      CREATE INDEX IF NOT EXISTS idx_ban_bets_active ON ban_bets(is_active, target_joined_at);
      CREATE INDEX IF NOT EXISTS idx_bet_points_user ON bet_points(user_id, guild_id);
    `);
  }

  /**
   * Place a bet on whether a user will be banned
   */
  placeBet(
    bettorUserId: string,
    targetUserId: string,
    guildId: string,
    targetJoinedAt: Date,
    note?: string,
    predictedDaysUntilBan?: number | null,
  ): BanBet | null {
    try {
      const result = this.db
        .prepare(
          `
        INSERT INTO ban_bets (bettor_user_id, target_user_id, guild_id, note, predicted_days_until_ban, target_joined_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
        )
        .get(
          bettorUserId,
          targetUserId,
          guildId,
          note ?? null,
          predictedDaysUntilBan ?? null,
          targetJoinedAt.toISOString(),
        ) as BanBet;
      return result ?? null;
    } catch (e) {
      console.error("Failed to place bet:", e);
      return null;
    }
  }

  /**
   * Get all active bets for a specific target user
   */
  getActiveBetsForTarget(targetUserId: string, guildId: string): BanBet[] {
    try {
      const results = this.db
        .prepare(
          `
        SELECT * FROM ban_bets 
        WHERE target_user_id = ? 
          AND guild_id = ? 
          AND is_active = 1 
          AND is_won IS NULL
      `,
        )
        .all(targetUserId, guildId) as BanBet[];
      return results ?? [];
    } catch (e) {
      console.error("Failed to get active bets for target:", e);
      return [];
    }
  }

  /**
   * Check if a user has already bet on a target
   */
  hasBet(bettorUserId: string, targetUserId: string, guildId: string): boolean {
    try {
      const result = this.db
        .prepare(
          `
        SELECT id FROM ban_bets 
        WHERE bettor_user_id = ? 
          AND target_user_id = ? 
          AND guild_id = ?
          AND is_active = 1
      `,
        )
        .get(bettorUserId, targetUserId, guildId);
      return !!result;
    } catch (e) {
      console.error("Failed to check if bet exists:", e);
      return false;
    }
  }

  async processBan(targetUserId: string, guild: Guild): Promise<void> {
    try {
      // Start a transaction
      const processTransaction = this.db.transaction(() => {
        // Get all active bets for this target
        const activeBets = this.getActiveBetsForTarget(targetUserId, guild.id);

        if (activeBets.length === 0) {
          return;
        }

        const banTime = new Date();

        // Process each bet
        for (const bet of activeBets) {
          let timingCorrect = false;

          // Check if timing prediction was correct
          if (bet.predicted_days_until_ban !== null) {
            const betPlacedTime = new Date(bet.bet_placed_at);
            const daysSinceBet =
              (banTime.getTime() - betPlacedTime.getTime()) / Time.MS_PER_DAY;

            // Check if banned on predicted day
            timingCorrect =
              Math.ceil(daysSinceBet) === bet.predicted_days_until_ban;
          }

          // Update the bet record
          this.db
            .prepare(
              `
            UPDATE ban_bets 
            SET is_won = 1, is_active = 0, days_prediction_correct = ?
            WHERE id = ?
          `,
            )
            .run(timingCorrect ? 1 : 0, bet.id);

          this.addPoints(
            bet.bettor_user_id,
            guild.id,
            BettingConstants.POINTS_PER_WIN,
          );
          if (timingCorrect) {
            this.addPoints(
              bet.bettor_user_id,
              guild.id,
              BettingConstants.BONUS_POINTS,
            );
          }
        }
      });

      processTransaction();

      // Notify winners after transaction completes
      await this.notifyWinners(targetUserId, guild);
    } catch (e) {
      console.error("Failed to process ban:", e);
    }
  }

  /**
   * Notify all winning bettors when a user is banned
   */
  private async notifyWinners(
    targetUserId: string,
    guild: Guild,
  ): Promise<void> {
    const activeBets = this.getActiveBetsForTarget(targetUserId, guild.id);

    for (const bet of activeBets) {
      try {
        const bettor = await guild.members.fetch(bet.bettor_user_id);
        if (bettor) {
          const totalPoints =
            BettingConstants.POINTS_PER_WIN +
            (bet.days_prediction_correct ? BettingConstants.BONUS_POINTS : 0);
          const suffix =
            bet.predicted_days_until_ban !== null &&
            bet.days_prediction_correct
              ? " and how many days it would take"
              : "";
          const message = `You received ${pluralize(totalPoints, "point")} for correctly predicting a ban${suffix}.`;

          await bettor.send(message);
        }
      } catch (e) {
        console.error(`Failed to notify bettor ${bet.bettor_user_id}:`, e);
      }
    }
  }

  /**
   * Deactivate expired bets (outside the betting window)
   */
  deactivateExpiredBets(bettingWindowHours: number): number {
    try {
      const cutoffTime = new Date(
        Date.now() - bettingWindowHours * Time.MS_PER_HOUR,
      );

      const result = this.db
        .prepare(
          `
        UPDATE ban_bets 
        SET is_active = 0, is_won = 0
        WHERE is_active = 1 
          AND is_won IS NULL
          AND target_joined_at < ?
      `,
        )
        .run(cutoffTime.toISOString());

      return result.changes;
    } catch (e) {
      console.error("Failed to deactivate expired bets:", e);
      return 0;
    }
  }

  /**
   * Add points to a user
   */
  addPoints(userId: string, guildId: string, points: number): void {
    try {
      this.db
        .prepare(
          `
        INSERT INTO bet_points (user_id, guild_id, points)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, guild_id) 
        DO UPDATE SET points = points + ?
      `,
        )
        .run(userId, guildId, points, points);
    } catch (e) {
      console.error("Failed to add points:", e);
    }
  }

  /**
   * Get a user's points
   */
  getPoints(userId: string, guildId: string): number {
    try {
      const result = this.db
        .prepare(
          `
        SELECT points FROM bet_points 
        WHERE user_id = ? AND guild_id = ?
      `,
        )
        .get(userId, guildId) as BetPoints | undefined;
      return result?.points ?? 0;
    } catch (e) {
      console.error("Failed to get points:", e);
      return 0;
    }
  }

  /**
   * Get leaderboard (top users by points)
   */
  getLeaderboard(guildId: string, limit: number = 10): BetPoints[] {
    try {
      const results = this.db
        .prepare(
          `
        SELECT * FROM bet_points 
        WHERE guild_id = ? 
        ORDER BY points DESC 
        LIMIT ?
      `,
        )
        .all(guildId, limit) as BetPoints[];
      return results ?? [];
    } catch (e) {
      console.error("Failed to get leaderboard:", e);
      return [];
    }
  }

  /**
   * Get unbanned users with the most active bets (for mod command)
   */
  getUnbannedUsersWithMostBets(
    guildId: string,
    limit: number = 10,
  ): Array<{
    target_user_id: string;
    bet_count: number;
  }> {
    try {
      const results = this.db
        .prepare(
          `
        SELECT target_user_id, COUNT(*) as bet_count
        FROM ban_bets
        WHERE guild_id = ? 
          AND is_active = 1 
          AND is_won IS NULL
        GROUP BY target_user_id
        ORDER BY bet_count DESC
        LIMIT ?
      `,
        )
        .all(guildId, limit) as Array<{
        target_user_id: string;
        bet_count: number;
      }>;
      return results ?? [];
    } catch (e) {
      console.error("Failed to get unbanned users with most bets:", e);
      return [];
    }
  }

  /**
   * Get all bets placed by a user
   */
  getUserBets(userId: string, guildId: string): BanBet[] {
    try {
      const results = this.db
        .prepare(
          `
        SELECT * FROM ban_bets 
        WHERE bettor_user_id = ? AND guild_id = ?
        ORDER BY bet_placed_at DESC
      `,
        )
        .all(userId, guildId) as BanBet[];
      return results ?? [];
    } catch (e) {
      console.error("Failed to get user bets:", e);
      return [];
    }
  }
}

export default new BettingStore();
