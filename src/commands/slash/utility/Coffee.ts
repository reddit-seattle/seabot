import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "coffee",
  description: "Ask for coffee",
  builder: new SlashCommandBuilder(),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply(Strings.coffee);
  },
});
