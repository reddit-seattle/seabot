import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";

export default new Command({
    adminOnly: true,
    name: 'speak',
    description: 'Gives SeaBot a voice!',
    help: 'Gives SeaBot a voice!',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('speak')
            .setDescription('Give SeaBot a voice!')
            .setDefaultPermission(false)
            .addStringOption(opt => 
                opt.setName('text')
                    .setDescription('what to say')
                    .setRequired(true))
    },
    executeSlashCommand: async (interaction) => {
        const { options, channel } = interaction;
        const text = options.getString('text', true);
        await interaction.reply({content: text, ephemeral: true});
        await channel?.send(text);
    }   
});