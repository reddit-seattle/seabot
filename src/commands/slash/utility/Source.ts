import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  name: "source",
  description: "look at my insides",
  builder: new ChatInputCommandBuilder(),
  execute: (interaction) => {
    const repoURL = "https://github.com/reddit-seattle/seabot";
    interaction.reply(`Look at my insides!\n${repoURL}`);
  },
});
