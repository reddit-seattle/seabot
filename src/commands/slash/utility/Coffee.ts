import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "coffee",
  description: "Ask for coffee",
  builder: new ChatInputCommandBuilder()
    .setName("coffee")
    .setDescription("Ask for coffee"),
  execute: (interaction) => interaction.reply(Strings.coffee),
});
