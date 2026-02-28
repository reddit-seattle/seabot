import {
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  MessageFlags,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import bettingStore from "../../../db/BettingStore";
import { BettingConstants } from "../../../utils/constants";
import { validateBet } from "./BetValidation";

type BetInteraction =
  | ChatInputCommandInteraction
  | ModalSubmitInteraction
  | UserContextMenuCommandInteraction;

export interface PlaceBetParams {
  interaction: BetInteraction;
  targetUserId: string;
  note?: string;
}

/**
 * Shared logic for placing a bet and building the response
 */
export async function handleBetPlacement(
  params: PlaceBetParams,
): Promise<InteractionReplyOptions> {
  const { interaction, targetUserId, note } = params;

  // Validate note length
  if (note && note.length > BettingConstants.MAX_NOTE_LENGTH) {
    return {
      content: `Note is too long. Maximum ${BettingConstants.MAX_NOTE_LENGTH} characters allowed.`,
      flags: MessageFlags.Ephemeral,
    };
  }

  // Validate bet placement
  const validation = await validateBet(interaction, targetUserId);
  if (!validation.valid) {
    return {
      content: validation.errorMessage!,
      flags: MessageFlags.Ephemeral,
    };
  }

  const joinTime = validation.joinTime!;

  // Place the bet
  const bet = bettingStore.placeBet(
    interaction.user.id,
    targetUserId,
    interaction.guildId!,
    joinTime,
    note,
  );

  if (!bet) {
    return {
      content: "Failed to place bet.",
      flags: MessageFlags.Ephemeral,
    };
  }

  // Build response message
  let responseMessage = "Bet placed.";
  if (note) {
    responseMessage += ` Note: ${note}`;
  }

  return {
    content: responseMessage,
    flags: MessageFlags.Ephemeral,
  };
}
