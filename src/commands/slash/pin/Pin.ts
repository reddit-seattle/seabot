import { ChatInputCommandBuilder } from "@discordjs/builders";
import { ChatInputCommandInteraction, RESTJSONErrorCodes } from "discord.js";

import SlashCommand from "../SlashCommand";
import { resolveThreadPinTarget } from "./shared";

export default new SlashCommand({
  description:
    "Pin a message in this thread (defaults to the thread's first message)",
  help: "pin [message id or link — omit to pin the thread's first message]",
  name: "pin",
  builder: new ChatInputCommandBuilder().addStringOptions([
    (option) =>
      option
        .setName("message")
        .setDescription(
          "Message ID or link to pin; leave empty to pin the thread's first message",
        )
        .setRequired(false),
  ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const message = await resolveThreadPinTarget(interaction);
    if (!message) return;

    if (message.pinned) {
      await interaction.editReply(`📌 Already pinned: ${message.url}`);
      return;
    }

    try {
      await message.pin();
    } catch (err: any) {
      if (
        err.code === RESTJSONErrorCodes.MaximumNumberOfPinsReachedForTheChannel
      ) {
        await interaction.editReply(
          "This thread already has the maximum of 50 pins.",
        );
        return;
      }
      if (err.code === RESTJSONErrorCodes.MissingPermissions) {
        await interaction.editReply(
          "I need the **Manage Messages** permission here to pin.",
        );
        return;
      }
      throw err;
    }

    await interaction.editReply(`📌 Pinned: ${message.url}`);
  },
});
