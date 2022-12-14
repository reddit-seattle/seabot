import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  name: "source",
  description: "look at my insides",
  builder: new SlashCommandBuilder(),
  execute: async (interaction) => {
    const repoURL = "https://github.com/reddit-seattle/seabot";
    await interaction.reply(`Look at my insides!\n${repoURL}`);
  },
});
