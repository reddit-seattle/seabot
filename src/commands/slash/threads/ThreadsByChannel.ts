import { APIEmbedField, EmbedBuilder, SlashCommandBuilder, TextChannel, ThreadChannel } from "discord.js";
import { configuration } from "../../../server";
import SlashCommand from "../SlashCommand";

const getActiveThreads = async (channel: TextChannel) => {
    const activeThreads = await channel.guild.channels.fetchActiveThreads();
    const {threads} = activeThreads;
    const filteredThreads = threads.filter(
        thread => 
        (
            (
                thread.parent?.parentId && 
                configuration.telemetry?.categories?.includes(thread.parent?.parentId)
            ) || 
            (
                thread.parentId && 
                configuration.telemetry?.channels?.includes(thread.parentId)
            )
        ) && 
        thread.parentId==channel.id
    );
    const channelThreads: ThreadChannel[] = [];
    filteredThreads.forEach(thread => {
        channelThreads.push(thread);
    });
    return channelThreads;
}


export default new SlashCommand({
    adminOnly: false,
    name: 'threads',
    help: "List threads for a specific channel",
    description: 'List active threads in a channel',
    builder: new SlashCommandBuilder()
            .setName('threads')
            .setDescription('List active threads in a channel')
            .addChannelOption(opt => 
                opt.setName('channel')
                    .setDescription('list threads for which channel')
                    .setRequired(false))
            .addBooleanOption(opt => 
                opt.setName('share')
                    .setDescription('send results to the channel')
                    .setRequired(false)),
    execute: async (interaction) => {
        const { options, channel: currentChannel} = interaction;
        const ephemeral = !options.getBoolean('share', false);
        // default to ephemeral responses
        await interaction.deferReply({ephemeral});

        const requestedChannel = options.getChannel('channel', false);
        const channel = requestedChannel ? requestedChannel : currentChannel;
        // text channel or bust
        if( !(channel instanceof TextChannel)) {
            interaction.editReply('Channel must be a text channel');
            return;
        }
        const { name } = channel;
        const threads = await getActiveThreads(channel);
        if(threads?.[0]){
            const threadFields: APIEmbedField[] = [];
            for(let i = 0; i < threads.length; i++) {
                const thread = await threads[i].fetch();
                const lastMessage = await thread.lastMessage?.fetch();
                threadFields.push({
                    name: `${thread.name}`,
                    value: `[${thread.totalMessageSent} messages](${thread.url})
                    ${
                        lastMessage
                        ? `Last message <t:${Math.floor(lastMessage.createdTimestamp / 1000)}:R>`
                        : ''
                    }`,
                    inline: false
                });
            }
            const embed = new EmbedBuilder({
                title: `Active Threads in ${name}`,
                fields: threadFields
            });
            interaction.editReply({embeds: [embed]});
        }
        else {
            interaction.editReply(`${name} has no active threads`);
        }
    }   
});