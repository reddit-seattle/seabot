import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

import SlashCommand from "../SlashCommand";

import { ServerInfo } from "../../../utils/constants";

export default new SlashCommand({
  name: "valheim",
  description: "show valheim server info",
  builder: new SlashCommandBuilder(),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply({
      embeds: [
        new EmbedBuilder({
          title: `**Valheim Dedicated Server Information**`,
          description: ServerInfo.Valheim.serverName,
          fields: [
            {
              name: "IP",
              value: ServerInfo.Valheim.ipAddress,
            },
            {
              name: "pass",
              value: ServerInfo.Valheim.access ?? "`undefined`",
            },
          ],
        }),
      ],
    });
  },
});
