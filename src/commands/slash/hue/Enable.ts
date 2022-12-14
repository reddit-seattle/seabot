import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { Environment } from "../../../utils/constants";

export default new SlashCommand({
  name: "hueFeature",
  help: "hueFeature enable|disable",
  adminOnly: true,
  description: "enables or disables the hue command features",
  builder: new SlashCommandBuilder().addBooleanOption((option) => {
    return option
      .setName("enable")
      .setDescription("Enable or disable the feature")
      .setRequired(true);
  }),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const enabled = await interaction.options.getBoolean("enable", true);
    process.env[Environment.Constants.hueEnabled] = enabled ? "true" : "false";
    await interaction.reply({
      ephemeral: true,
      content: `Hue commands: ${enabled ? "enabled" : "disabled"}`,
    });
  },
});
