import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../models/Command";
import WeatherApi from "./WeatherApi";

export default new Command({
    description: 'Get current weather',
    help: 'weather [98102 | Seattle]',
    name: 'weather',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('weather')
            .setDescription('Get current weather for a location')
            .addStringOption(option => option.setName('location').setDescription('string location or zip code').setRequired(true))
    },
    executeSlashCommand: async (interaction) => {
        const location = interaction.options.getString('location');
        if(location) {
            const { currentWeather, geoInfo, embedBuilder } = await WeatherApi.getCurrentWeather(location);
            const geoString = (geoInfo ?
                [geoInfo.name, geoInfo?.state || null, geoInfo.country]
                : [currentWeather?.name, currentWeather?.sys?.country]
            ).filter(val => !!val).join(', '); // remove nulls and create string;
            const titleString = `Current weather for ${geoString}`;
            const richEmbed = embedBuilder(titleString);
            interaction.reply({embeds: [richEmbed]});
        }
    }
});
