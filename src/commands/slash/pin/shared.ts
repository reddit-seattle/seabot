import {
  AnyThreadChannel,
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  Message,
  MessageFlags,
  RESTJSONErrorCodes,
} from "discord.js";

import { configuration } from "../../../server";
import { parseMessageId } from "../../../utils/helpers";

// Forum/media posts: fetchStarterMessage returns the post's first message,
// which lives inside the thread. Text-channel threads: the starter lives in
// the parent channel (not pinnable here), so fall back to the oldest
// in-thread message.
async function fetchFirstThreadMessage(
  thread: AnyThreadChannel,
): Promise<Message | null> {
  const starter = await thread.fetchStarterMessage().catch(() => null);
  if (starter?.channelId === thread.id) return starter;
  const batch = await thread.messages.fetch({ after: "0", limit: 1 });
  return batch.first() ?? null;
}

/**
 * Shared front half of /pin and /unpin: defers the reply, enforces the
 * events-thread and thread-owner/moderator gates, and resolves the target
 * message (the "message" option, or the thread's first message by default).
 * Replies with the failure reason and returns null if any gate fails.
 */
export async function resolveThreadPinTarget(
  interaction: ChatInputCommandInteraction,
): Promise<Message | null> {
  const command = `/${interaction.commandName}`;

  // Defer immediately so the interaction can't time out. Ephemeral: errors
  // stay private, and on success Discord already posts a public
  // "pinned a message" system message in the thread.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const pinChannelId = configuration?.channelIds?.["EVENTS_FORUM"];
  if (!pinChannelId) {
    await interaction.editReply(
      "Pinning is not configured (set channelIds.EVENTS_FORUM in the config).",
    );
    return null;
  }

  const channel = interaction.channel;
  if (!channel?.isThread() || channel.parentId !== pinChannelId) {
    await interaction.editReply(
      `${command} only works inside threads of <#${pinChannelId}>.`,
    );
    return null;
  }

  const isModerator = (
    interaction.member?.roles as GuildMemberRoleManager
  )?.cache.has(configuration.roleIds.moderator);
  const threadOwnerId =
    channel.ownerId ?? (await channel.fetchOwner().catch(() => null))?.id;
  if (!isModerator && threadOwnerId !== interaction.user.id) {
    await interaction.editReply(
      `Only the person who started this thread (or a moderator) can use ${command}.`,
    );
    return null;
  }

  const messageInput = interaction.options.getString("message");
  let messageId: string | null = null;
  if (messageInput) {
    messageId = parseMessageId(messageInput);
    if (!messageId) {
      await interaction.editReply(
        "That does not look like a message ID or message link.",
      );
      return null;
    }
  }

  let message: Message | null;
  try {
    message = messageId
      ? await channel.messages.fetch(messageId)
      : await fetchFirstThreadMessage(channel);
  } catch (err: any) {
    await interaction.editReply(
      err.code === RESTJSONErrorCodes.UnknownMessage
        ? `No message \`${messageId}\` in this thread — the message must be in the thread you run ${command} from.`
        : `Could not fetch the message: ${err.message}`,
    );
    return null;
  }
  if (!message) {
    await interaction.editReply(
      `This thread has no messages to ${interaction.commandName}.`,
    );
    return null;
  }

  return message;
}
