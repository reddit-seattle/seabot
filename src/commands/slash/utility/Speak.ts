import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  adminOnly: true,
  name: "speak",
  description: "Gives SeaBot a voice!",
  builder: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName("text").setDescription("what to say").setRequired(true)
    ),
  execute: async (interaction) => {
    const { options, channel } = interaction;
    const text = options.getString("text", true);
    await interaction.reply({ content: text, ephemeral: true });
    await channel?.send(text);
  },
});
