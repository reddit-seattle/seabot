import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";

export default new Command({
    name: 'source',
    help: 'source',
    description: 'look at my insides',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('source')
            .setDescription('look at my insides!')
    },
    executeSlashCommand: (interaction) => {
        const repoURL = 'https://github.com/reddit-seattle/seabot';
        interaction.reply(`Look at my insides!\n${repoURL}`);
    }
});