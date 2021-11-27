import { Client, Message, TextChannel } from 'discord.js';
import { ChannelIds } from '../utils/constants';

export const deleteMessages = async (message: Message) => {
    try {
        const msgs = await message.channel.messages.fetch({ before: message.id, limit: 11 });
        if (msgs.size < 10) {
            return;
        }
        const msg = msgs.at(8);
        const previous = (await message.channel.messages.fetch({ before: msg?.id, limit: 50 }));
        (message.channel as TextChannel)?.bulkDelete(previous, true);
    }
    catch (e) {
        console.dir(e);
    }

};

export const clearChannel = async (client: Client) => {
    client.guilds.cache.forEach(async (guild) => {
        const rantChannel = guild.channels.cache.find(ch => ch.id == ChannelIds.RANT) as TextChannel;
        if(!rantChannel) {
            return;
        }
        const last = (await rantChannel?.messages.fetch({ limit: 1 })).first();
        if (!last) {
            return;
        }
        const date = new Date();
        const hours_since = (date.getTime() - last.createdAt.getTime()) / 1000 / 60 / 60;
        if (hours_since > 1) {
            //last message is over an hour old, kill it all
            const previous = (await rantChannel.messages.fetch({ limit: 50 }));
            rantChannel.bulkDelete(previous, true);
            // rantChannel.send('Messages here will be deleted as new messages are typed. The channel will be cleared if no messages are sent within one hour.');

        }
    });
}
