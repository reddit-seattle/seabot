import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";
import {
  getCurrentSeasonIndex,
  SeattleSeasonsImageGenerator,
} from "../../../utils/SeattleSeasonsImageGenerator";

export default new SlashCommand({
  name: "seasons",
  description: "which season is seattle in?",
  builder: new ChatInputCommandBuilder()
    .setName("seasons")
    .setDescription("which season is seattle in?"),
  execute: async (interaction) => {
    await interaction.deferReply();

    try {
      const date = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }),
      );
      const seasonIndex = getCurrentSeasonIndex(date);
      const imageBuffer =
        SeattleSeasonsImageGenerator.generateSeasonsImage(seasonIndex);

      await interaction.editReply({
        files: [imageBuffer],
      });
    } catch (error) {
      console.error("Error generating seasons image:", error);
      await interaction.editReply({
        content: "Tell burn that shit is broken",
      });
    }
  },
});
