import { SlashCommandBuilder, Message } from "discord.js";
import { Command } from "../../models/Command";

export default new Command({
    name: 'ping',
    help: 'ping',
    description: 'ping',
    execute: (message: Message) => message.channel.send('pong!'),
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('ping')
            .setDescription('ping')
    },
    executeSlashCommand: (interaction) => {
        interaction.reply('pong!')
    }
});