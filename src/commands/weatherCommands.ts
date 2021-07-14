import { MessageEmbed } from "discord.js";
import moment from "moment";
import fetch from "node-fetch";
import { each } from "underscore";
import { URLSearchParams } from "url";
import { Command } from "../models/Command";
import { WeeklyForecastResponse, ForecastResponse, GeocodeResponse, WeatherResponse, Coord, AirQualityResponse } from "../models/WeatherModels";
import { Environment, Endpoints } from "../utils/constants";

const fetchInfo = {
    headers: {
        'User-Agent': 'SEABot discord bot'
    },
    method: 'GET',
}
const buildQueryStringForLocation = (location: string) => {
    return new URLSearchParams({
        q: `${location}`,
        units: 'imperial',
        appid: Environment.weatherAPIKey
    });
}
const buildQueryStringForZip = (zip: string) => {
    return new URLSearchParams({
        zip: `${zip}`,
        units: 'imperial',
        appid: Environment.weatherAPIKey
    });
}

const buildQueryStringForCoords = (coords: Coord, limit: number = 1) => {
    return new URLSearchParams({
        lat: `${coords.lat}`,
        lon: `${coords.lon}`,
        limit: `${limit}`,
        appid: Environment.weatherAPIKey
    });
}

const callAPI = async<T>(uri: string) => {
    const result = await fetch(uri, fetchInfo);
    return await result.json() as T;
}

const getCurrentWeatherByLocation = async (location: string) => {
    const queryString = buildQueryStringForLocation(location);
    const uri = `${Endpoints.currentWeatherURL}?${queryString}`
    return await callAPI<WeatherResponse>(uri);
};

const getCurrentWeatherByZip = async (zip: string) => {
    const queryString = buildQueryStringForZip(zip);
    const uri = `${Endpoints.currentWeatherURL}?${queryString}`
    return await callAPI<WeatherResponse>(uri);
};

const getForecastByLocation = async (location: string, weekly?: boolean) => {
    const queryString = buildQueryStringForLocation(location);
    const uri = `${weekly ? Endpoints.weeklyForecastURL : Endpoints.dailyForecastURL}?${queryString}`
    if (weekly) {
        return await callAPI<WeeklyForecastResponse>(uri);
    }
    return await callAPI<ForecastResponse>(uri);
}

const getForecastByZip = async (zip: string, weekly?: boolean) => {
    const queryString = buildQueryStringForZip(zip);
    const uri = `${weekly ? Endpoints.weeklyForecastURL : Endpoints.dailyForecastURL}?${queryString}`
    if (weekly) {
        return await callAPI<WeeklyForecastResponse>(uri);
    }
    return await callAPI<ForecastResponse>(uri);

}

const getForecastGeoInfo = async (response: ForecastResponse | WeeklyForecastResponse) => {
    const { coord } = response?.city;
    return await reverseGeoByCoord(coord);

}
const getWeatherGeoInfo = async (response: WeatherResponse) => {
    const { coord } = response;
    return await reverseGeoByCoord(coord);
}

const reverseGeoByCoord = async (coords: Coord) => {
    const queryString = buildQueryStringForCoords(coords);
    const uri = `${Endpoints.geocodingReverseURL}?${queryString}`;
    return await callAPI<GeocodeResponse[]>(uri);
}

const isNumber = (location: string) => {
    return !isNaN(parseInt(location));
}

export const ForecastCommand: Command = {
    description: 'Get weather forecast in 3-hour intervals',
    help: 'forecast [98102 | Seattle] {optional: `weekly`}',
    name: 'forecast',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            message.channel.send('forecast feature not enabled');
            return;
        }
        // escape if we don't have more than just $forecast
        if (!args?.[1]) {
            message.channel.send('Please provide a location');
            return;
        }
        const weekly = args?.[args.length - 1] === 'weekly'; // currently only supports "weekly"
        const location = args?.slice(1, weekly ? -1 : undefined)?.join(' ');
        const isZip = isNumber(location);
        if (!!location) {
            const forecastReponse = await (isZip ? getForecastByZip(location, weekly) : getForecastByLocation(location, weekly));

            const geoInfo = (await getForecastGeoInfo(forecastReponse))?.[0];
            const geoString = (geoInfo ?
                [geoInfo.name, geoInfo?.state || null, geoInfo.country]
                : [forecastReponse?.city?.name, forecastReponse?.city?.country]
            ).filter(val => !!val).join(', '); // remove nulls and create string;
            const title = `${weekly ? `Weekly f` : `F`}orecast for ${geoString}`;
            const embed = weekly
                ? buildWeeklyResponse(forecastReponse as WeeklyForecastResponse, title)
                : buildForecastResponse(forecastReponse as ForecastResponse, title);
            message.channel.send(embed);

        }
        else {
            message.channel.send('Please provide a location');
        }
    }
}

const buildForecastResponse = (response: any, title: string): MessageEmbed => {
    const richEmbed = new MessageEmbed()
        .setTitle(title);
    let { list } = response;
    each(list.slice(0, 5), (record) => {
        const time = moment.unix(record.dt).utcOffset(-8).format("HH:mm");
        const weather = `${record.main.temp}° F - ${record.weather[0].description}, ${record.main.humidity}% humidity`;
        richEmbed.addField(time, weather, false);
    });
    return richEmbed;
}

const buildWeeklyResponse = (response: WeeklyForecastResponse, title: string): MessageEmbed => {

    const richEmbed = new MessageEmbed()
        .setTitle(title);
    let { list } = response;
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


export const WeatherCommand: Command = {
    description: 'Get current weather',
    help: 'weather [98102 | Seattle]',
    name: 'weather',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            message.channel.send('forecast feature not enabled');
        }
        // escape if we don't have more than just $weather
        if (!args?.[1]) {
            message.channel.send('Please provide a location');
            return;
        }
        // join all args besides $weather into a string to search
        const location = args?.slice(1)?.join(' ');
        const isZip = isNumber(location);
        if (!!location) {
            const weatherResponse = await (isZip ? getCurrentWeatherByZip(location) : getCurrentWeatherByLocation(location));
            const geoInfo = (await getWeatherGeoInfo(weatherResponse))?.[0];
            const geoString = (geoInfo ?
                [geoInfo.name, geoInfo?.state || null, geoInfo.country]
                : [weatherResponse?.name, weatherResponse?.sys?.country]
            ).filter(val => !!val).join(', '); // remove nulls and create string;
            const titleString = `Current weather for ${geoString}`;
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

export const AirQualityCommand: Command = {
    description: 'Get current air quality',
    help: 'aqi 98102',
    name: 'aqi',
    execute: async (message, args) => {
        if (!Environment.weatherAPIKey) {
            message.channel.send('forecast feature not enabled');
        }
        // escape if we don't have args
        if (!args?.[1]) {
            message.channel.send('Please provide a location');
            return;
        }
        const location = args?.[1];
        const isZip = isNumber(location) && location.length == 5;
        if (!isZip) {
            message.channel.send('Invalid ZIP');
            return;
        }
        const airQuality = (await getAirQualityByZip(location))?.[0];
        if (!airQuality) {
            message.channel.send('Invalid response');
            return;
        }
        const embed = new MessageEmbed({
            title: `Air quality for ${airQuality.ReportingArea}`,
            fields: [
                {
                    name: 'Date',
                    value: `${airQuality.DateForecast}`,
                    inline: false
                },
                {
                    name: `AQI`,
                    value: `${airQuality.AQI}`,
                    inline: false
                },
                {
                    name: 'Description',
                    value:`${airQuality.Discussion}`,
                }
            ]
        });
        message.channel.send(embed);

    }
}

const buildQueryStringForAirQuality = (location: string) => {
    return new URLSearchParams({
        format: 'application/json',
        zipCode: location,
        distance: '10',
        API_KEY: Environment.airQualityAPIKey
    });
}

const getAirQualityByZip = async (zip: string) => {
    const queryString = buildQueryStringForAirQuality(zip);
    const uri = `${Endpoints.airQualityByZipURL}?${queryString}`
    return await callAPI<AirQualityResponse[]>(uri);
};