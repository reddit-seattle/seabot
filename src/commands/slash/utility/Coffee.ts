import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "coffee",
  description: "Ask for coffee",
  builder: new ChatInputCommandBuilder(),
  execute: (interaction) => interaction.reply(Strings.coffee),
});
