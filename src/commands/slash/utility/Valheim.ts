import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { ServerInfo } from "../../../utils/constants";

export default new SlashCommand({
  name: "valheim",
  description: "show valheim server info",
  builder: new SlashCommandBuilder(),
  execute: (interaction) =>
    interaction.reply(
      `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
    ),
});
