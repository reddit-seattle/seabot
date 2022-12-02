import { Client, Guild, Message, TextChannel } from "discord.js";

import { configuration } from "../../server";
import { minutesToMilliseconds } from "../../utils/time";
import ContentCommand from "./ContentCommand";

export default new ContentCommand({
    name: "AutoClearChannel",
    description: "Automatically clears a channel when text is entered.",
    adminOnly: false,
    trigger: /./,
    handler: (message: Message) => {
        if (shouldClearChannel(message)) {
            deleteMessages(message);
        }
    },
});

export async function clearChannels(client: Client) {
    async function clearChannel(guild: Guild, channelClearInfo: { id: string, frequency: number }) {
        const channelToClear = guild.channels.cache.find(({ id }) => id === channelClearInfo.id) as TextChannel;
        if (!channelToClear) {
            return;
        }

        const last = (await channelToClear.messages.fetch({ limit: 1 })).first();
        if (!last) {
            return;
        }

        let messageAge = Date.now() - last.createdAt.getTime();
        if (messageAge >= minutesToMilliseconds(channelClearInfo.frequency)) {
            const previous = await channelToClear.messages.fetch({ limit: 50 });
            channelToClear.bulkDelete(previous, true);
        }
    }

    client.guilds.cache.forEach(async (guild) => {
        configuration.autoDeleteMessagesInChannels?.forEach((channelClearInfo) => clearChannel(guild, channelClearInfo));
    });
}

async function deleteMessages(message: Message) {
    try {
        const msgs = await message.channel.messages.fetch({ before: message.id, limit: 11 });
        if (msgs.size < 10) {
            return;
        }
        const msg = msgs.at(8);
        const previous = await message.channel.messages.fetch({ before: msg?.id, limit: 50 });
        (message.channel as TextChannel)?.bulkDelete(previous, true);
    } catch (e) {
        console.dir(e);
    }
}

function shouldClearChannel(message: Message): Boolean {
    if (!configuration.autoDeleteMessagesInChannels) return false;

    return (
        message.channel instanceof TextChannel &&
        (configuration.autoDeleteMessagesInChannels.find(x => x.id === message.channel.id) != null)
    );
}
