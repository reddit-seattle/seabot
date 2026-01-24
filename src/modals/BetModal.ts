import { MessageFlags, ModalSubmitInteraction } from "discord.js";
import { handleBetPlacement } from "../commands/slash/betting/BetHelpers";

export const BET_MODAL_PREFIX = "betban_modal_";

/**
 * Handle modal submissions for betting
 */
export async function handleBetModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  // Extract target user ID from custom ID
  const targetUserId = interaction.customId.replace(BET_MODAL_PREFIX, "");

  // Get form values
  const daysInput = interaction.fields.getTextInputValue("days");
  const note = interaction.fields.getTextInputValue("note") || undefined;

  // Parse and validate days
  let daysUntilBan: number | null = null;
  if (daysInput) {
    const parsedDays = parseInt(daysInput, 10);
    if (isNaN(parsedDays) || parsedDays < 1) {
      return interaction.reply({
        content: "Days must be a positive number.",
        flags: MessageFlags.Ephemeral,
      });
    }
    daysUntilBan = parsedDays;
  }

  const response = await handleBetPlacement({
    interaction,
    targetUserId,
    note,
    daysUntilBan,
  });

  return interaction.reply(response);
}
