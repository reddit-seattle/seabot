import { SlashCommandBuilder, Message } from "discord.js";
import { Command } from "../../models/Command";
import { Strings } from "../../utils/constants";

export default new Command({
    name: 'coffee',
    help: 'coffee',
    description: 'ask for coffee',
    execute: (message: Message) => message.channel.send(Strings.coffee),
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('coffee')
            .setDescription('ask for coffee')
    },
    executeSlashCommand: (interaction) => {
        interaction.reply(Strings.coffee)
    }
});