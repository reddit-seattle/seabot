import { SlashCommandBuilder, Message } from "discord.js";
import { Command } from "../../models/Command";
import { Strings } from "../../utils/constants";

export default new Command({
    name: 'tea',
    help: 'tea',
    description: 'ask for tea',
    execute: (message: Message) => message.channel.send(Strings.teapot),
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('tea')
            .setDescription('ask for tea')
    },
    executeSlashCommand: (interaction) => {
        interaction.reply(Strings.teapot)
    }
});