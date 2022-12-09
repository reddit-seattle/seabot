import { TextChannel } from "discord.js";
import { AutoDeleteConfiguration } from "../configuration/ISeabotConfig";

import IScheduledTask from "./IScheduledTask";

import { configuration } from "../server";
import { daysToMilliseconds } from "../utils/Time/conversion";
import { discordBot } from "../server";
import { Duration } from "../utils/Time/Duration";

// TODO: Constants have been lifted. Extract once constants file / config file has been separated better.
const defaults = {
    numberOfMessages: 10,
    maximumMessagesToFetch: 50,
};

// Discord only allows us to bulk delete messages under 14 days old.
const maximumBulkMessageAge = daysToMilliseconds(14) - 1;

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
            const channelToClear = guild.channels.cache.get(channelClearInfo.targetId) as TextChannel;
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

        const lastMessageAge = new Date().getTime() - channel.lastMessage.createdAt.getTime();
        const minimumMessageAge = configurationEntry.timeBeforeClearing.getMilliseconds();
        let allMessages = await channel.messages.fetch();

        // delete all messages over the maximum age
        if (lastMessageAge >= minimumMessageAge ) {
            const oldMessages = allMessages.filter(
                (message) => message.createdAt.getTime() < maximumBulkMessageAge
            );
            await channel.bulkDelete(oldMessages);
        }

        // delete messages greater than maximum message count (if configured)
        if(numberOfMessages && allMessages.size > numberOfMessages) {
        
            const messagesToPrune = allMessages.last(allMessages.size - numberOfMessages);
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

function getConfigurationEntry(targetId: string): AutoDeleteConfiguration | undefined {
    return configuration.autoDeleteMessages?.channels.find((x) => x.targetId === targetId);
}
