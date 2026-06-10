import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  AnyThreadChannel,
  ChatInputCommandInteraction,
  Message,
  MessageFlags,
} from "discord.js";

import SlashCommand from "../SlashCommand";
import { configuration } from "../../../server";

// Forum/media posts: the starter message lives inside the thread and shares
// the thread's ID. Text-channel threads: the starter lives in the parent
// channel (not pinnable here), so fall back to the oldest in-thread message.
async function fetchFirstThreadMessage(
  thread: AnyThreadChannel,
): Promise<Message | null> {
  const starter = await thread.messages.fetch(thread.id).catch(() => null);
  if (starter) return starter;
  const batch = await thread.messages.fetch({ after: "0", limit: 1 });
  return batch.first() ?? null;
}

// Accepts a bare snowflake or a message link
// (https://discord.com/channels/<guild>/<channel>/<message>).
function parseMessageId(input: string): string | null {
  const match = input.trim().match(/(\d{17,20})\/?$/);
  return match ? match[1] : null;
}

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
    const pinChannelId = configuration?.channelIds?.["EVENTS_CHANNEL"];
    if (!pinChannelId) {
      await interaction.reply({
        content:
          "Pinning is not configured (set channelIds.EVENTS_CHANNEL in the config).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel?.isThread() || channel.parentId !== pinChannelId) {
      await interaction.reply({
        content: `/pin only works inside threads of <#${pinChannelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const messageInput = interaction.options.getString("message");
    let messageId: string | null = null;
    if (messageInput) {
      messageId = parseMessageId(messageInput);
      if (!messageId) {
        await interaction.reply({
          content: "That does not look like a message ID or message link.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await interaction.deferReply();

    let message: Message | null;
    try {
      message = messageId
        ? await channel.messages.fetch(messageId)
        : await fetchFirstThreadMessage(channel);
    } catch (err: any) {
      await interaction.editReply(
        err.code === 10008
          ? `No message \`${messageId}\` in this thread — the message must be in the thread you run /pin from.`
          : `Could not fetch the message: ${err.message}`,
      );
      return;
    }
    if (!message) {
      await interaction.editReply("This thread has no messages to pin.");
      return;
    }

    if (message.pinned) {
      await interaction.editReply(`📌 Already pinned: ${message.url}`);
      return;
    }

    try {
      await message.pin();
    } catch (err: any) {
      if (err.code === 30003) {
        await interaction.editReply(
          "This thread already has the maximum of 50 pins.",
        );
        return;
      }
      if (err.code === 50013) {
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
