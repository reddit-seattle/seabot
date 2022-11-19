import { SlashCommandBuilder, Message } from "discord.js";
import { Command } from "../../models/Command";
import { Strings } from "../../utils/constants";

export default new Command({
    description: 'whoops',
    name: 'whoops',
    help: 'whoops my butt :butt: -> whoops my butt fell out :butt:',
    execute: (message: Message, args?: string[]) => {
        const emoji = args?.pop();
        if (!emoji) return;
        const text = args?.join(' ');
        if (!text || text === '') return;
        message.channel.send(Strings.whoops(text, emoji));
    },
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('whoops')
            .setDescription('whoops my emoji fell out')
            .addStringOption(option => {
                return option
                    .setName('object')
                    .setDescription('what fell out (include `my`, `the`, etc)')
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName('emote')
                    .setDescription('what does it look like (emote / ascii)')
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName('bottomtext')
                    .setDescription('optional, replaces `fell off`')
                    .setRequired(false);
            });
    },
    executeSlashCommand: (interaction) => {
        const emoji = interaction.options.getString('emote', true);
        const object = interaction.options.getString('object', true);
        const bottomText = interaction.options.getString('bottomtext', false);
        interaction.reply(Strings.whoops(object, emoji, bottomText || undefined));
    }
});