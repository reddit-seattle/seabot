import { Message, MessageEmbed } from "discord.js";
import moment from "moment";
import fetch from "node-fetch";
import { each } from "underscore";
import { URLSearchParams } from "url";
import { Command } from "../models/Command";
import { Environment, Endpoints, Config } from "../utils/constants";

const fetchInfo = {
    headers: {
        'User-Agent': 'SEABot discord bot'
    },
    method: 'GET',
}

export interface ForecastResponse {
    city: {
        name: string;
    },
    list: { dt: number, weather: { description: string }[], main: { humidity: string, temp: string } }[]
}

const buildWeatherRequestUri: (zip: string, uri: string) => string = (zip, uri) => {
    const queryString = new URLSearchParams({
        zip: `${zip},us`,
        units: 'imperial',
        appid: Environment.weatherAPIKey
    });
    return `${uri}?${queryString}`
};

export const ForecastCommand: Command = {
    description: 'Get weather forecast in 3-hour intervals',
    name: 'forecast',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
            message.channel.send('forecast feature not enabled');
        }
        else {
            const zip = args[1];
            if (!zip || !parseInt(zip) || zip.length != 5) {
                message.channel.send(`Invalid zip code. Usage example: "${Config.prefix}forecast 98102"`);
            }
            else {
                const uri = buildWeatherRequestUri(zip, Endpoints.weatherForecastURL);
                const result = await fetch(uri, fetchInfo);

                const response = await result.json() as ForecastResponse;
                const richEmbed = new MessageEmbed()
                    .setTitle(`Forecast for ${response.city.name}:`);

                each(response.list.slice(0, 5), (record) => {
                    const time = moment.unix(record.dt).utcOffset(-8).format("HH:mm");
                    const weather = `${record.main.temp}° F - ${record.weather[0].description}, ${record.main.humidity}% humidity`;
                    richEmbed.addField(time, weather, false);
                });
                message.channel.send(richEmbed);
            }
        }
    }
}

export interface WeatherResponse {
    wind: {
        deg: number;
        speed: string;
    },
    name: string,
    main: {
        temp: string;
        humidity: string;
    },
    weather: {
        description: string;
    }[],
}

export const WeatherCommand: Command = {
    description: 'Get current weather',
    name: 'weather',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
            message.channel.send('forecast feature not enabled');
        }
        else {
            const zip = args[1];
            if (!zip || !parseInt(zip) || zip.length != 5) {
                message.channel.send(`Invalid zip code. Usage example: "${Config.prefix}weather 98102"`);
            }
            else {
                const uri = buildWeatherRequestUri(zip, Endpoints.currentWeatherURL);
                const result = await fetch(uri, fetchInfo);

                const response = await result.json() as WeatherResponse;
                const richEmbed = new MessageEmbed()
                    .setTitle(`Current weather for ${response.name}:`);

                var val = Math.floor((response.wind.deg / 22.5) + 0.5);
                var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                const windDir = arr[(val % 16)];
                const weather = `${response.weather[0].description}, ${response.main.humidity}% humidity. Winds ${windDir} @ ${response.wind.speed} mph`;
                richEmbed.addField(`${response.main.temp}° F`, weather);
                message.channel.send(richEmbed);
            }
        }
    }
}