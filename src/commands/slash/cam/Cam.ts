import { AttachmentBuilder, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import _ from "underscore";

import SlashCommand from "../SlashCommand";
import WeatherApi from "../weather/WeatherApi";

const WEBCAM_CONFIG = {
    webcams: [
        {
            id: "rainier",
            url: "https://www.nps.gov/webcams-mora/mountain.jpg",
            description: "Mount Rainier",
            zip: "98304",
            enabled: true
        },
        {
            id: "sodo",
            url: "https://cdn.tegna-media.com/king/weather/roofcam1.jpg",
            description: "King5 roof cam",
            zip: "98134",
            enabled: true
        },
        {
            id: "qa",
            url: "https://cdn.tegna-media.com/king/weather/queenanne.jpg",
            description: " Queen Anne Hill",
            zip: "98109",
            enabled: true
        }
        // Add more working webcams here
    ]
};

// Filter to only enabled webcams
const SEATTLE_WEBCAMS = WEBCAM_CONFIG.webcams.filter(cam => cam.enabled);

async function getCurrentSeattleImage(webcams = SEATTLE_WEBCAMS): Promise<{ buffer: Buffer; source: string; description: string, zip: string } | null> {
    // shuffle has a few chances in case a webcam is down
    for (const webcam of webcams) {
        try {
            console.log(`Trying to fetch image from: ${webcam.description} (${webcam.url})`);
            const response = await fetch(webcam.url, {
                timeout: 3000 // 3 second timeout
            });

            if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
                const buffer = Buffer.from(await response.arrayBuffer());
                if (buffer.length > 1000) {
                    return {
                        buffer,
                        source: webcam.id,
                        description: webcam.description,
                        zip: webcam.zip
                    };
                }
            }
        } catch (error) {
            console.log(`Failed to fetch from ${webcam.id}:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
        }
    }

    return null;
}

async function getSeattleWeatherContext(zip: string): Promise<string> {
    const now = new Date();
    const timeStr = now.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });
    try {
        // Get current weather for Seattle
        const weatherResult = await WeatherApi.getCurrentWeather(zip);
        if (weatherResult && weatherResult.currentWeather) {
            const weather = weatherResult.currentWeather;
            const temp = Math.round(parseFloat(weather.main.temp));
            const description = weather.weather[0].description;
            const emoji = getWeatherEmoji(description);
            return `${emoji} ${temp}°F • ${description}\n📅 ${timeStr}`;
        }
    } catch (error) {
        console.log('Failed to get weather context:', error);
    }


    return `${timeStr}`;
}

function getWeatherEmoji(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('clear') || desc.includes('sunny')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain') || desc.includes('shower')) return '🌧️';
    if (desc.includes('drizzle')) return '🌦️';
    if (desc.includes('storm')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('mist') || desc.includes('fog') || desc.includes('haze')) return '🌫️';

    return '🌤️';
}

// Build the slash command dynamically from config
function buildSlashCommand(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder();

    // Add subcommands for each enabled webcam
    SEATTLE_WEBCAMS.forEach(webcam => {
        builder.addSubcommand(subcommand =>
            subcommand
                .setName(webcam.id)
                .setDescription(webcam.description)
        );
    });

    // Always add a random option
    builder.addSubcommand(subcommand =>
        subcommand
            .setName("random")
            .setDescription("Random webcam")
    );

    return builder;
}

export default new SlashCommand({
    name: "cam",
    description: "check out some webcams",
    builder: buildSlashCommand(),
    execute: async (interaction) => {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();

            let cams = _.shuffle(SEATTLE_WEBCAMS);
            if (subcommand != "random") {
                // Randomly select one webcam
                const foundCam = SEATTLE_WEBCAMS.find(cam => cam.id === subcommand);
                if (foundCam) {
                    cams = [foundCam];
                }
            }
            // Get current image
            const imageResult = await getCurrentSeattleImage(cams);

            if (!imageResult) {
                await interaction.editReply({
                    content: "Tell burn that shit is broken",
                });
                return;
            }

            const filename = 'cam.jpg'

            // Get weather/time context
            const weatherContext = await getSeattleWeatherContext(imageResult.zip);
            const attachment = new AttachmentBuilder(imageResult.buffer, {
                name: filename
            });

            const embed = new EmbedBuilder()
                .setTitle(imageResult.description)
                .setDescription(`${weatherContext}`)
                .setImage(`attachment://${filename}`)
                .setColor('#0066cc')
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                files: [attachment]
            });

        } catch (error) {
            console.error('Error fetching webcam image:', error);

            await interaction.editReply({
                content: "Tell burn that shit is broken",
            });
        }
    },
});
