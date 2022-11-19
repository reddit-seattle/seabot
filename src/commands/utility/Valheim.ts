import { SlashCommandBuilder, Message } from "discord.js";
import { Command } from "../../models/Command";
import { ServerInfo } from "../../utils/constants";

export default new Command({
    description: 'show valheim server info',
    help: 'valheim',
    name: 'valheim',
    execute: (message: Message) => message.channel.send(
        `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
    ),
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('valheim')
            .setDescription('show valheim server info')
    },
    executeSlashCommand: (interaction) => {
        interaction.reply(
            `**Valheim Dedicated Server Information**:
            server: \`${ServerInfo.Valheim.serverName}\`
            ip: \`${ServerInfo.Valheim.ipAddress}\`
            password: \`${ServerInfo.Valheim.access}\`
            `
        )
    }
});