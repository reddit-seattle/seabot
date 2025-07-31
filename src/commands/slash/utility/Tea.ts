import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "tea",
  help: "tea",
  description: "ask for tea",
  builder: new ChatInputCommandBuilder()
    .setName("tea")
    .setDescription("ask for tea"),
  execute: (interaction) => interaction.reply(Strings.teapot),
});
