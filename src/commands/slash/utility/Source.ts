import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  name: "source",
  description: "look at my insides",
  builder: new ChatInputCommandBuilder()
    .setName("source")
    .setDescription("look at my insides"),
  execute: (interaction) => {
    const repoURL = "https://github.com/reddit-seattle/seabot";
    interaction.reply(`Look at my insides!\n${repoURL}`);
  },
});
