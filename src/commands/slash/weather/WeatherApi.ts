import { EmbedBuilder } from "discord.js";
import moment from "moment";
import fetch from "node-fetch";
import { each } from "underscore";
import { URLSearchParams } from "url";

import {
  WeeklyForecastResponse,
  ForecastResponse,
  GeocodeResponse,
  WeatherResponse,
  Coord,
  AirQualityForecastResponse,
  AirQualityCurrentResponse,
} from "../../../models/WeatherModels";
import { Environment, Endpoints } from "../../../utils/constants";

export default class WeatherApi {
  public static async getAirQualityByZip(zip: string) {
    const queryString = this.buildQueryStringForAirQuality(zip);
    const uri = `${Endpoints.airQualityCurrentByZipURL}?${queryString}`;
    return await this.callAPI<AirQualityCurrentResponse>(uri);
  }

  public static async getAirQualityForecastByZip(zip: string) {
    const queryString = this.buildQueryStringForAirQuality(zip);
    const uri = `${Endpoints.airQualityForecastByZipURL}?${queryString}`;
    return await this.callAPI<AirQualityForecastResponse>(uri);
  }

  public static async getCurrentWeather(location: string) {
    const queryString = this.isZip(location)
      ? this.buildQueryStringForZip(location)
      : this.buildQueryStringForLocation(location);

    const uri = `${Endpoints.currentWeatherURL}?${queryString}`;
    const currentWeather = await WeatherApi.callAPI<WeatherResponse>(uri);

    // The weather API encountered an error.
    if (!currentWeather) {
      return undefined;
    }

    const geoInfo = (
      await WeatherApi.reverseGeoByCoord(currentWeather?.coord)
    )?.[0];
    const embedBuilder = (title: string) =>
      this.buildCurrentWeatherEmbed(currentWeather, title);

    return { currentWeather, geoInfo, embedBuilder };
  }

  public static async getWeatherForecast(location: string, weekly = false) {
    const queryString = this.isZip(location)
      ? this.buildQueryStringForZip(location)
      : this.buildQueryStringForLocation(location);

    const uri = `${
      weekly ? Endpoints.weeklyForecastURL : Endpoints.dailyForecastURL
    }?${queryString}`;
    const forecast = await (weekly
      ? WeatherApi.callAPI<WeeklyForecastResponse>(uri)
      : WeatherApi.callAPI<ForecastResponse>(uri));
    if (!forecast?.city?.coord) {
      return;
    }
    const geoInfo = (await this.reverseGeoByCoord(forecast?.city.coord))?.[0];
    const embedBuilder = (title: string) =>
      weekly
        ? this.buildWeeklyEmbed(forecast as WeeklyForecastResponse, title)
        : this.buildForecastEmbed(forecast as ForecastResponse, title);

    return { forecast, geoInfo, embedBuilder };
  }

  private static buildCurrentWeatherEmbed(
    response: WeatherResponse,
    title: string
  ): EmbedBuilder {
    const richEmbed = new EmbedBuilder().setTitle(title);
    var val = Math.floor(response.wind.deg / 22.5 + 0.5);
    var arr = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const windDir = arr[val % 16];
    const weather = `${response.weather[0].description}, ${response.main.humidity}% humidity. Winds ${windDir} @ ${response.wind.speed} mph`;
    richEmbed.addFields([{ name: `${response.main.temp}° F`, value: weather }]);
    return richEmbed;
  }

  private static buildForecastEmbed(
    response: ForecastResponse,
    title: string
  ): EmbedBuilder {
    const richEmbed = new EmbedBuilder().setTitle(title);
    let { list } = response;
    each(list.slice(0, 5), (record) => {
      const time = moment.unix(record.dt).utcOffset(-8).format("HH:mm");
      const weather = `${record.main.temp}° F - ${record.weather[0].description}, ${record.main.humidity}% humidity`;
      richEmbed.addFields({
        name: time,
        value: weather,
        inline: false,
      });
    });
    return richEmbed;
  }

  private static buildWeeklyEmbed(
    response: WeeklyForecastResponse,
    title: string
  ): EmbedBuilder {
    const richEmbed = new EmbedBuilder().setTitle(title);
    let { list } = response;
    each(list.slice(0, 7), (record) => {
      const date = moment
        .unix(record.dt)
        .utcOffset(-8)
        .format("dddd MMMM Do, YYYY");
      const weather = `
                Low ${record.temp.min}° - High ${record.temp.max}°
                ${record.weather[0].description}
                Sunrise: ${moment.unix(record.sunrise).format("HH:mm")}
                Sunset: ${moment.unix(record.sunset).format("HH:mm")}
            `;
      richEmbed.addFields([
        {
          name: date,
          value: weather,
          inline: false,
        },
      ]);
    });
    return richEmbed;
  }

  private static async reverseGeoByCoord(coords: Coord) {
    const queryString = WeatherApi.buildQueryStringForCoords(coords);
    const uri = `${Endpoints.geocodingReverseURL}?${queryString}`;
    return await WeatherApi.callAPI<GeocodeResponse[]>(uri);
  }

  private static isZip(location: string) {
    return !isNaN(parseInt(location));
  }

  private static buildQueryStringForAirQuality(location: string) {
    return new URLSearchParams({
      format: "application/json",
      zipCode: location,
      distance: "50",
      API_KEY: Environment.airQualityAPIKey,
    });
  }

  private static buildQueryStringForLocation(location: string) {
    return new URLSearchParams({
      q: `${location}`,
      units: "imperial",
      appid: Environment.weatherAPIKey,
    });
  }

  private static buildQueryStringForZip(zip: string) {
    return new URLSearchParams({
      zip: `${zip}`,
      units: "imperial",
      appid: Environment.weatherAPIKey,
    });
  }

  private static buildQueryStringForCoords(coords: Coord, limit: number = 1) {
    return new URLSearchParams({
      lat: `${coords.lat}`,
      lon: `${coords.lon}`,
      limit: `${limit}`,
      appid: Environment.weatherAPIKey,
    });
  }

  private static async callAPI<T>(uri: string) {
    const result = await fetch(uri, {
      headers: {
        "User-Agent": "SEABot discord bot",
      },
      method: "GET",
    });
    const data = await result.json();
    // bad response
    if ("cod" in data && data.cod == "404") {
      return null;
    }
    return data as T;
  }
}
