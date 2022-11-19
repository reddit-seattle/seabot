import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { Emoji } from "../../utils/constants";
import { toSarcasticCase } from "../../utils/helpers";

export default new Command({
    name: 'sarcasm',
    help: 'sarcasm text',
    description: 'make text sArCaStIc',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('sarcasm')
            .setDescription('make text sArCaStIc')
            .addStringOption(option => {
                return option.setName('text')
                .setDescription('text to sArCaStIcIzE')
                .setRequired(true)
            })
    },
    executeSlashCommand: (interaction) => {
        const string = interaction.options.getString('text') ?? null;
        string && interaction.reply(`${Emoji.stupidsponge} ${toSarcasticCase(string)} ${Emoji.stupidsponge}`);
    }
});