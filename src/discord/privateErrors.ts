import { MessageFlags } from "discord.js";
import type { ChatInputCommandInteraction, ModalSubmitInteraction, ButtonInteraction } from "discord.js";
import { AiCheckError } from "../aiDetection/types";

type PrivateInteraction = ChatInputCommandInteraction | ModalSubmitInteraction | ButtonInteraction;

/** Never log error objects: SDK errors can contain request bodies and interaction tokens. */
export async function respondPrivateError(interaction: PrivateInteraction, error: unknown): Promise<void> {
  const content = error instanceof AiCheckError ? error.message : "SeaBot could not complete this request. Please try later.";
  const payload = { content, allowedMentions: { parse: [] as never[] } };
  try {
    if (interaction.deferred && !interaction.isButton()) {
      await interaction.editReply({ ...payload, embeds: [], components: [] });
    } else if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }
  } catch {
    // A lost acknowledgement/expired token cannot safely fall back to a channel message.
    console.warn("Private interaction error response could not be delivered.");
  }
}
