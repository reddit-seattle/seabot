import { MessageEmbed } from "discord.js";
import moment from "moment";
import fetch from "node-fetch";
import { each } from "underscore";
import { URLSearchParams } from "url";
import { Command } from "../models/Command";
import { DailyForecastResponse, GeocodeResponse } from "../models/WeatherModels";
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

const buildWeatherRequestUri: (location: string, uri: string) => string = (location, uri) => {
    const queryString = new URLSearchParams({
        q: `${location}`,
        units: 'imperial',
        appid: Environment.weatherAPIKey
    });
    return `${uri}?${queryString}`
};

export const ForecastCommand: Command = {
    description: 'Get weather forecast in 3-hour intervals',
    help: 'forecast [98102 | Seattle] {optional: `weekly`}',
    name: 'forecast',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
            message.channel.send('forecast feature not enabled');
        }
        else {
            const location = args?.[1];
            const weekly = args?.[2] === 'weekly'; // currently only supports "weekly"
            if (!!location) {
                const uri = buildWeatherRequestUri(location, weekly ? Endpoints.dailyForecastURL : Endpoints.weatherForecastURL);
                const result = await fetch(uri, fetchInfo);

                const response = await result.json();
                const geoUri = buildWeatherRequestUri(location, Endpoints.geocodingURL);
                const geoResult = await fetch(geoUri, fetchInfo);
                const geoResponse = (await geoResult.json() as GeocodeResponse[])?.[0];

                const embed = weekly ? buildWeeklyResponse(response, geoResponse) : buildForecastResponse(response, geoResponse);
                message.channel.send(embed);

            }
            else {
                message.channel.send('Please provide a location');
            }
        }
    }
}

const buildWeeklyResponse = (response: any, geoResponse: GeocodeResponse): MessageEmbed => {

    const dailyForecast = response as DailyForecastResponse;
    const titleString = `Weekly forecast for ${geoResponse ? `${geoResponse.name}, ${geoResponse.state} ${geoResponse.country}` : `${response.name}`}`;
    const richEmbed = new MessageEmbed()
        .setTitle(titleString);
    let { list } = dailyForecast;
    each(list.slice(0, 7), (record) => {
        const date = moment.unix(record.dt).utcOffset(-8).format("dddd MMMM Do, YYYY");
        const weather = `
            Low ${record.temp.min}° - High ${record.temp.max}°
            ${record.weather[0].description}
            Sunrise: ${moment.unix(record.sunrise).format("HH:mm")}
            Sunset: ${moment.unix(record.sunset).format("HH:mm")}
        `;
        richEmbed.addField(date, weather, false);
    });
    return richEmbed;
}

const buildForecastResponse = (response: any, geoResponse: GeocodeResponse): MessageEmbed => {
    response = response as ForecastResponse;
    const titleString = `Forecast for ${geoResponse ? `${geoResponse.name}, ${geoResponse.state} ${geoResponse.country}` : `${response.name}`}`;
    const richEmbed = new MessageEmbed()
        .setTitle(titleString);
    let { list } = response;
    each(response.list.slice(0, 5), (record) => {
        const time = moment.unix(record.dt).utcOffset(-8).format("HH:mm");
        const weather = `${record.main.temp}° F - ${record.weather[0].description}, ${record.main.humidity}% humidity`;
        richEmbed.addField(time, weather, false);
    });
    return richEmbed;
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
    sys: {
        country: string;
    }
}

export const WeatherCommand: Command = {
    description: 'Get current weather',
    help: 'weather [98102 | Seattle]',
    name: 'weather',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
            message.channel.send('forecast feature not enabled');
        }
        else {
            const location = args?.[1];
            if (!!location) {
                const weatherUri = buildWeatherRequestUri(location, Endpoints.currentWeatherURL);
                const weatherResult = await fetch(weatherUri, fetchInfo);
                const weatherResponse = await weatherResult.json() as WeatherResponse;
                const geoUri = buildWeatherRequestUri(location, Endpoints.geocodingURL);
                const geoResult = await fetch(geoUri, fetchInfo);
                const geoResponse = (await geoResult.json() as GeocodeResponse[])?.[0];
                const titleString = `Current weather for ${geoResponse ? `${geoResponse.name}, ${geoResponse.state} ${geoResponse.country}` : `${weatherResponse.name}`}`;
                const richEmbed = new MessageEmbed()
                    .setTitle(titleString);
                var val = Math.floor((weatherResponse.wind.deg / 22.5) + 0.5);
                var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                const windDir = arr[(val % 16)];
                const weather = `${weatherResponse.weather[0].description}, ${weatherResponse.main.humidity}% humidity. Winds ${windDir} @ ${weatherResponse.wind.speed} mph`;
                richEmbed.addField(`${weatherResponse.main.temp}° F`, weather);
                message.channel.send(richEmbed);
            }
            else {
                message.channel.send('Please provide a location')
            }
        }
    }
}