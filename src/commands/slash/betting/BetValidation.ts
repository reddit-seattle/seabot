import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import bettingStore from "../../../db/BettingStore";
import { BettingConstants, Time } from "../../../utils/constants";

export interface BetValidationResult {
  valid: boolean;
  errorMessage?: string;
  joinTime?: Date;
}

type BetInteraction =
  | ChatInputCommandInteraction
  | ModalSubmitInteraction
  | UserContextMenuCommandInteraction;

export async function validateBet(
  interaction: BetInteraction,
  targetUserId: string,
): Promise<BetValidationResult> {
  const guildId = interaction.guildId!;
  const bettorUserId = interaction.user.id;

  // Fetch target user
  const targetUser = await interaction.client.users.fetch(targetUserId);

  // Don't allow betting on bots
  if (targetUser.bot) {
    return {
      valid: false,
      errorMessage: "Invalid target user.",
    };
  }

  // Don't allow betting on yourself
  if (targetUserId === bettorUserId) {
    return {
      valid: false,
      errorMessage: "I admire your confidence, but no.",
    };
  }

  // Check if user already bet on this target
  if (bettingStore.hasBet(bettorUserId, targetUser.id, guildId)) {
    return {
      valid: false,
      errorMessage: "You already bet on this user.",
    };
  }

  // Get when the target user joined
  let joinTime: Date | null = null;
  try {
    const guild = await interaction.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(targetUserId);
    joinTime = member.joinedAt;
  } catch (e) {
    // they left?
  }

  if (!joinTime) {
    return {
      valid: false,
      errorMessage: "Betting window expired.",
    };
  }

  // Check if betting window is still open
  const hoursSinceJoin = (Date.now() - joinTime.getTime()) / Time.MS_PER_HOUR;
  if (hoursSinceJoin > BettingConstants.BETTING_WINDOW_HOURS) {
    return {
      valid: false,
      errorMessage: "Betting window expired.",
    };
  }

  return {
    valid: true,
    joinTime,
  };
}
