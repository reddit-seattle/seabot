import { ChannelType, TextChannel } from "discord.js";
import { AutoDeleteConfiguration } from "../configuration/ISeabotConfig";
import { Logger } from "../utils/logger";

import IScheduledTask from "./IScheduledTask";

import { configuration, discordBot } from "../server";
import { Duration } from "../utils/Time/Duration";

const BULK_DELETE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const AutoClearChannels: IScheduledTask = {
  name: "AutoClearChannel",
  description: "Automatically clears a channel when text is entered.",
  frequency: new Duration({ minutes: 1 }),
  handler: clearChannels,
};

export default AutoClearChannels;

async function clearChannels() {
  const results = await Promise.allSettled(
    discordBot.client.guilds.cache.map(async (guild) => {
      const channels = configuration.autoDeleteMessages?.channels ?? [];
      const channelResults = await Promise.allSettled(
        channels.map((channelClearInfo) => {
          const channelToClear = guild.channels.cache.get(
            channelClearInfo.targetId,
          );
          if (
            !channelToClear ||
            !channelToClear.isTextBased() ||
            channelToClear.type !== ChannelType.GuildText
          ) {
            return Promise.resolve();
          }
          return deleteMessages(
            channelToClear as TextChannel,
            channelClearInfo.numberOfMessages,
          );
        }),
      );
      for (const result of channelResults) {
        if (result.status === "rejected") {
          Logger.error(
            `Error clearing channels in guild ${guild.id}:`,
            result.reason,
          );
        }
      }
    }),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      Logger.error("Error in clearChannels:", result.reason);
    }
  }
}

async function deleteMessages(channel: TextChannel, numberOfMessages?: number) {
  try {
    const configurationEntry = getConfigurationEntry(channel.id);
    if (!configurationEntry) {
      return;
    }

    const minimumMessageCreatedTime =
      Date.now() - configurationEntry.timeBeforeClearing.getMilliseconds() - 1;

    let allMessages = await channel.messages.fetch({ limit: 100 });

    // delete all messages over the maximum age
    const oldMessages = allMessages.filter(
      (message) => message.createdAt.getTime() < minimumMessageCreatedTime,
    );
    if (oldMessages?.size) {
      // bulkDelete only works on messages < 14 days old
      const now = Date.now();
      const bulkDeletable = oldMessages.filter(
        (m) => now - m.createdAt.getTime() < BULK_DELETE_MAX_AGE_MS,
      );
      const tooOld = oldMessages.filter(
        (m) => now - m.createdAt.getTime() >= BULK_DELETE_MAX_AGE_MS,
      );

      if (bulkDeletable.size > 0) {
        await channel.bulkDelete(bulkDeletable);
      }
      if (tooOld.size > 0) {
        await Promise.allSettled(
          tooOld.filter((m) => m.deletable).map((m) => m.delete()),
        );
      }

      // Re-fetch after deletion so the count below reflects the current state
      allMessages = await channel.messages.fetch({ limit: 100 });
    }

    // delete messages greater than maximum message count (if configured)
    if (numberOfMessages && allMessages.size > numberOfMessages) {
      const messagesToPrune = allMessages.last(
        allMessages.size - numberOfMessages,
      );
      await Promise.all(
        messagesToPrune
          .filter((message) => message.deletable)
          .map((message) => message.delete()),
      );
    }
  } catch (e) {
    Logger.error("Error in deleteMessages:", e);
  }
}

function getConfigurationEntry(
  targetId: string,
): AutoDeleteConfiguration | undefined {
  return configuration.autoDeleteMessages?.channels.find(
    (x) => x.targetId === targetId,
  );
}
