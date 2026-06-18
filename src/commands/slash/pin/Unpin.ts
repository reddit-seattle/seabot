import { ChatInputCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, RESTJSONErrorCodes } from "discord.js";

import SlashCommand from "../SlashCommand";
import { resolveThreadPinTarget } from "./shared";

export default new SlashCommand({
  description:
    "Unpin a message in this thread (defaults to the thread's first message)",
  help: "unpin [message id or link — omit to unpin the thread's first message]",
  name: "unpin",
  builder: new ChatInputCommandBuilder().addStringOptions([
    (option) =>
      option
        .setName("message")
        .setDescription(
          "Message ID or link to unpin; leave empty to unpin the thread's first message",
        )
        .setRequired(false),
  ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const message = await resolveThreadPinTarget(interaction);
    if (!message) return;

    if (!message.pinned) {
      await interaction.editReply(`That message is not pinned: ${message.url}`);
      return;
    }

    try {
      await message.unpin();
    } catch (err: any) {
      if (err.code === RESTJSONErrorCodes.MissingPermissions) {
        await interaction.editReply(
          "I need the **Manage Messages** permission here to unpin.",
        );
        return;
      }
      throw err;
    }

    await interaction.editReply(`📌 Unpinned: ${message.url}`);
  },
});
