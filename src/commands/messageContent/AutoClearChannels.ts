import { Client, Guild, Message, TextChannel } from "discord.js";
import { configuration } from "../../server";

export default {
    trigger: /./,
    handler: (message: Message) => {
        if (shouldClearChannel(message)) {
            deleteMessages(message);
        }
    },
};

export async function clearChannels(client: Client) {
    async function clearChannel(guild: Guild, channelId: string) {
        const channelToClear = guild.channels.cache.find(({ id }) => id == channelId) as TextChannel;
        if (!channelToClear) {
            return;
        }

        const last = (await channelToClear?.messages.fetch({ limit: 1 })).first();
        if (!last) {
            return;
        }

        const date = new Date();
        const hours_since = (date.getTime() - last.createdAt.getTime()) / 1000 / 60 / 60;
        if (hours_since > 1) {
            //last message is over an hour old, kill it all
            const previous = await channelToClear.messages.fetch({ limit: 50 });
            channelToClear.bulkDelete(previous, true);
            // channelToClear.send('Messages here will be deleted as new messages are typed. The channel will be cleared if no messages are sent within one hour.');
        }
    }

    client.guilds.cache.forEach(async (guild) => {
        configuration.autoDeleteMessagesInChannels?.forEach((channelId) => clearChannel(guild, channelId));
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
        configuration.autoDeleteMessagesInChannels.includes(message.channel.id)
    );
}
