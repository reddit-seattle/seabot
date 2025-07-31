import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { ServerInfo } from "../../../utils/constants";

export default new SlashCommand({
  name: "valheim",
  description: "show valheim server info",
  builder: new ChatInputCommandBuilder()
    .setName("valheim")
    .setDescription("show valheim server info"),
  execute: (interaction) =>
    interaction.reply(
      `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
    ),
});
