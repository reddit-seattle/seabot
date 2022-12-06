import { Client, FetchMessagesOptions, Guild, Message, TextChannel } from "discord.js";
import { AutoDeleteConfiguration } from "../ISeabotConfig";

import IScheduledTask from "./IScheduledTask";
import { discordBot } from "../server";
import { configuration } from "../server";
import { daysToMilliseconds } from "../utils/Time/conversion";
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

            deleteMessages(channelToClear, channelClearInfo.numberofMessages);
        });
    });
}

async function deleteMessages(channel: TextChannel, numberOfMessages: number) {
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
        if (lastMessageAge < minimumMessageAge) {
            return;
        }

        const fetchOptions: FetchMessagesOptions = {
            limit: numberOfMessages,
        };

        let messagesToDelete = await channel.messages.fetch(fetchOptions);

        const bulkDelete = messagesToDelete.filter(
            (message) => message.createdAt.getTime() < maximumBulkMessageAge && !message.pinned
        );

        const manualDelete = messagesToDelete.filter((message) => !bulkDelete.get(message.id));
        manualDelete.forEach((message) => {
            if (message.deletable) {
                message.delete();
            }
        });

        channel.bulkDelete(bulkDelete);
    } catch (e) {
        console.dir(e);
    }
}

function shouldClearChannel(channel: TextChannel): Boolean {
    if (!configuration.autoDeleteMessages) return false;

    const channelConfig = getConfigurationEntry(channel.id);
    return channelConfig != undefined;
}

function getConfigurationEntry(targetId: string): AutoDeleteConfiguration | undefined {
    return configuration.autoDeleteMessages?.channels.find((x) => x.targetId === targetId);
}
