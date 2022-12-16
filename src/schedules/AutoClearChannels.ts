import { TextChannel } from "discord.js";
import { AutoDeleteConfiguration } from "../configuration/ISeabotConfig";

import IScheduledTask from "./IScheduledTask";

import { configuration } from "../server";
import { discordBot } from "../server";
import { Duration } from "../utils/Time/Duration";

const AutoClearChannels: IScheduledTask = {
  name: "AutoClearChannel",
  description: "Automatically clears a channel when text is entered.",
  frequency: new Duration({ minutes: 1 }),
  handler: clearChannels,
};

export default AutoClearChannels;

async function clearChannels() {
  discordBot.client.guilds.cache.forEach(async (guild) => {
    configuration.autoDeleteMessages?.channels?.forEach((channelClearInfo) => {
      const channelToClear = guild.channels.cache.get(
        channelClearInfo.targetId
      ) as TextChannel;
      if (!channelToClear) {
        return;
      }

      deleteMessages(channelToClear, channelClearInfo.numberOfMessages);
    });
  });
}

async function deleteMessages(channel: TextChannel, numberOfMessages?: number) {
  try {
    if (!channel.lastMessage) {
      return;
    }

    const configurationEntry = getConfigurationEntry(channel.id);
    if (!configurationEntry) {
      return;
    }

    // delete everything before this
    const minimumMessageCreatedTime =
      Date.now() - configurationEntry.timeBeforeClearing.getMilliseconds() - 1;

    let allMessages = await channel.messages.fetch();

    // delete all messages over the maximum age
    const oldMessages = allMessages.filter(
      (message) => message.createdAt.getTime() < minimumMessageCreatedTime
    );
    if(oldMessages?.size) {
      await channel.bulkDelete(oldMessages);
    }

    // delete messages greater than maximum message count (if configured)
    if (numberOfMessages && allMessages.size > numberOfMessages) {
      const messagesToPrune = allMessages.last(
        allMessages.size - numberOfMessages
      );
      messagesToPrune.forEach((message) => {
        if (message.deletable) {
          message.delete();
        }
      });
    }
  } catch (e) {
    console.dir(e);
  }
}

function getConfigurationEntry(
  targetId: string
): AutoDeleteConfiguration | undefined {
  return configuration.autoDeleteMessages?.channels.find(
    (x) => x.targetId === targetId
  );
}
