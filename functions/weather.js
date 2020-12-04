const rp = require('request-promise');
const moment = require('moment');
const Discord = require('discord.js');
const _ = require('underscore');
const weatherForecastURL = 'https://api.openweathermap.org/data/2.5/forecast';
const currentWeatherURL = 'https://api.openweathermap.org/data/2.5/weather'
const constants = require('../utils/constants');
const weatherAPIKey = process.env['weatherAPIKey'];

const prefix = constants.PREFIX;

const buildOptions = (zip, uri) => {
    return {
        uri: uri,
        qs: {
            zip: `${zip},us`,
            units: 'imperial',
            appid: weatherAPIKey
        },
        headers: {
            'User-Agent': 'SEABot discord bot'
        },
        json: true
    }
};

module.exports.forecast = (message) => {
    if (!weatherAPIKey || weatherAPIKey == '') {
        console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
        message.channel.send('forecast feature not enabled');
    }
    else {
        const zip = message.content.split(' ')[1];
        if (!zip || !parseInt(zip) || zip.length != 5) {
            message.channel.send(`Invalid zip code. Usage example: "${prefix}forecast 98102"`);
        }
        else {
            const opts = buildOptions(zip, weatherForecastURL);
            rp(opts)
                .then((response) => {
                    const richEmbed = new Discord.RichEmbed()
                        .setTitle(`Forecast for ${response.city.name}:`);
                    _.each(response.list.slice(0, 5), (record) => {
                        const time = moment.unix(record.dt).format('HH:mm');
                        const weather = `${record.main.temp}° F - ${record.weather[0].description}, ${record.main.humidity}% humidity`;
                        richEmbed.addField(time, weather, false);
                    });
                    message.channel.send(richEmbed);
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }
};

module.exports.weather = (message) => {
    if (!weatherAPIKey || weatherAPIKey == '') {
        console.log(`Weather API key not found (env variable "weatherAPIKey") - weather commands will not work.`);
        message.channel.send('forecast feature not enabled');
    }
    else {
        const zip = message.content.split(' ')[1];
        if (!zip || !parseInt(zip) || zip.length != 5) {
            message.channel.send(`Invalid zip code. Usage example: "${prefix}weather 98102"`);
        }
        else {
            const opts = buildOptions(zip, currentWeatherURL);
            rp(opts)
                .then((response) => {
                    var val = Math.floor((response.wind.deg / 22.5) + 0.5);
                    var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                    const windDir = arr[(val % 16)];
                    const weather = `${response.main.temp}° F - ${response.weather[0].description}, ${response.main.humidity}% humidity. Winds ${windDir} @ ${response.wind.speed} mph`;
                    message.channel.send(`Current weather for ${response.name}:\n ${weather}`)
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }
};