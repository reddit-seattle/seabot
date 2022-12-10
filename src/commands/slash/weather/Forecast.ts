import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";
import WeatherApi from "./WeatherApi";

export default new SlashCommand({
  description: "Get weather forecast in 3-hour intervals",
  help: "forecast [98102 | Seattle] {optional: `weekly`}",
  name: "forecast",
  builder: new SlashCommandBuilder()
    .setName("forecast")
    .setDescription("Get weather forecast in 3-hour intervals")
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("string location or zip code")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("weekly")
        .setDescription("get weekly forecast instead of 3-hour intervals")
    ),
  execute: async (interaction) => {
    const location = interaction.options.getString("location");
    const weekly = interaction.options.getBoolean("weekly") ?? false;
    if (location) {
      await interaction.deferReply();
      const result = await WeatherApi.getWeatherForecast(location);
      if (!result) {
        await interaction.editReply(`Failed to get weather for ${location}`);
        return;
      }
      const { forecast, geoInfo, embedBuilder } = result;
      const geoString = (
        geoInfo
          ? [geoInfo.name, geoInfo?.state || null, geoInfo.country]
          : [forecast?.city?.name ?? null, forecast?.city?.country || null]
      )
        .filter((val) => !!val)
        .join(", "); // remove nulls and create string;
      const title = `${weekly ? `Weekly f` : `F`}orecast for ${geoString}`;
      const embed = embedBuilder(title);
      interaction.editReply({ embeds: [embed] });
      return;
    }

    interaction.reply("You must specify a valid location for the forecast.");
  },
});
