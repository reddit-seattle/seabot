import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";
import WeatherApi from "./WeatherApi";

export default new SlashCommand({
  description: "Get current weather",
  help: "weather [98102 | Seattle]",
  name: "weather",
  builder: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Get current weather for a location")
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("string location or zip code")
        .setRequired(true)
    ),
  execute: async (interaction) => {
    await interaction.deferReply();
    const location = interaction.options.getString("location");
    const response = await WeatherApi.getCurrentWeather(location);
    if (!response) {
      interaction.editReply("That's not a valid location!");
      return;
    }

    const { currentWeather, geoInfo, embedBuilder } = response;

    const geoString = (
      geoInfo
        ? [geoInfo.name, geoInfo?.state || null, geoInfo.country]
        : [currentWeather?.name ?? null, currentWeather?.sys?.country]
    )
      .filter((val) => !!val)
      .join(", "); // remove nulls and create string;
    const titleString = `Current weather for ${geoString}`;
    const richEmbed = embedBuilder(titleString);
    interaction.editReply({ embeds: [richEmbed] });
  },
});
