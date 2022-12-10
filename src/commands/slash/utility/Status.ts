import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { AppConfiguration } from "../../../utils/constants";
import { secondsToHours } from "../../../utils/Time/conversion";

export default new SlashCommand({
  description: "show seabot info",
  help: "status",
  name: "status",
  builder: new SlashCommandBuilder(),
  execute: (interaction) => {
    const process_uptime = Math.floor(process.uptime());
    const { client } = interaction;
    const { uptime } = client;
    const { versions, arch } = process;
    interaction.reply({
      embeds: [
        new EmbedBuilder({
          title: "SEABot Status",
          description: "Latest release and uptime info",
          fields: [
            {
              name: "Version info",
              value: `Node: ${versions.node}, V8: ${versions.v8}, OpenSSL: ${versions.openssl}`,
              inline: false,
            },
            {
              name: "Release number",
              value: `${AppConfiguration.BOT_RELEASE_VERSION}`,
              inline: true,
            },
            {
              name: "Release Description",
              value: `${AppConfiguration.BOT_RELEASE_DESCRIPTION}`,
              inline: true,
            },
            {
              name: "Release Commit",
              value: `${AppConfiguration.BOT_RELEASE_COMMIT}`,
              inline: true,
            },
            {
              name: "Architecture",
              value: `${arch}`,
              inline: true,
            },
            {
              name: "Release Method",
              value: `${AppConfiguration.BOT_RELEASE_REASON}`,
              inline: true,
            },
            {
              name: "Process Uptime",
              value: `${secondsToHours(process_uptime).toFixed(2)} hours`,
              inline: true,
            },
            {
              name: "Client Uptime",
              value: `${secondsToHours(uptime).toFixed(2)} hours`,
              inline: true,
            },
          ],
        }),
      ],
    });
  },
});
