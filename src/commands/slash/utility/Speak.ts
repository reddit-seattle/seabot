import { PermissionFlagsBits, MessageFlags } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  adminOnly: true,
  name: "speak",
  description: "Gives SeaBot a voice!",
  builder: new ChatInputCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOptions([
      (opt) =>
        opt.setName("text").setDescription("what to say").setRequired(true),
    ]),
  execute: async (interaction) => {
    const { options, channel } = interaction;
    const text = options.getString("text", true);
    await interaction.reply({ content: text, flags: MessageFlags.Ephemeral });
    await channel?.send(text);
  },
});
