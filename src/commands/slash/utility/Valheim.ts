import { SlashCommandBuilder, Message } from "discord.js";

import SlashCommand from "../SlashCommand";

import { ServerInfo } from "../../../utils/constants";

export default new SlashCommand({
    name: "valheim",
    description: "show valheim server info",
    builder: new SlashCommandBuilder(),
    execute: (message: Message) =>
        message.channel.send(
            `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
        ),
});
