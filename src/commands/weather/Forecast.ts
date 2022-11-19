import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import WeatherApi from "./WeatherApi";

export default new Command({
    description: "Get weather forecast in 3-hour intervals",
    help: "forecast [98102 | Seattle] {optional: `weekly`}",
    name: "forecast",
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName("forecast")
            .setDescription("Get weather forecast in 3-hour intervals")
            .addStringOption((option) =>
                option.setName("location").setDescription("string location or zip code").setRequired(true)
            )
            .addBooleanOption((option) =>
                option.setName("weekly").setDescription("get weekly forecast instead of 3-hour intervals")
            );
    },
    executeSlashCommand: async (interaction) => {
        const location = interaction.options.getString("location");
        const weekly = interaction.options.getBoolean("weekly") ?? false;
        if (location) {
            const { forecast, geoInfo, embedBuilder } = await WeatherApi.getWeatherForecast(location);
            const geoString = (
                geoInfo
                    ? [geoInfo.name, geoInfo?.state || null, geoInfo.country]
                    : [forecast?.city?.name, forecast?.city?.country]
            )
                .filter((val) => !!val)
                .join(", "); // remove nulls and create string;
            const title = `${weekly ? `Weekly f` : `F`}orecast for ${geoString}`;
            const embed = embedBuilder(title);
            interaction.reply({ embeds: [embed] });
        }
    },
});
