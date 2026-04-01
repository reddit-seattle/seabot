import dotenv from "dotenv";
dotenv.config();

export module Database {
  export const DATABASE_ID = "seabot";
  export module Containers {
    export const INCIDENTS = "Incidents";
  }
  export module Queries {
    // Add incident queries here when needed
  }
}

export module Endpoints {
  export const currentWeatherURL =
    "https://api.openweathermap.org/data/2.5/weather";
  export const dailyForecastURL =
    "https://api.openweathermap.org/data/2.5/forecast";
  export const weeklyForecastURL =
    "https://api.openweathermap.org/data/2.5/forecast/daily";
  export const geocodingDirectURL =
    "http://api.openweathermap.org/geo/1.0/direct";
  export const geocodingReverseURL =
    "http://api.openweathermap.org/geo/1.0/reverse";
  export const airQualityForecastByZipURL =
    "https://www.airnowapi.org/aq/forecast/zipCode/";
  export const airQualityCurrentByZipURL =
    "https://www.airnowapi.org/aq/observation/zipCode/current";
}

export module REGEX {
  export const EMOJI = /<a?:.[^:]+:(\d+)>/g;
  export const ROLE = /<@&(\d+)>/g;
  export const CHANNEL = /<#(\d+)>/g;
  export const USER = /<@(\d+)>/g;
  export const URL =
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g;
  export const HEX = /^\#[0-9A-F]{6}$/i;
}
export module Config {
  export const prefix = "$";
}

export module UserIDs {
  export const APOLLO = "475744554910351370";
}

export module GuildIds {
  export const Seattle = "370945003566006272";
}

export module AppConfiguration {
  export const BOT_RELEASE_VERSION =
    process.env["botReleaseVersion"] || undefined;
  export const BOT_RELEASE_REASON =
    process.env["botReleaseReason"] || undefined;
  export const BOT_RELEASE_DESCRIPTION =
    process.env["botReleaseDescription"] || undefined;
  export const BOT_RELEASE_COMMIT =
    process.env["botReleaseCommit"] || undefined;
}
export module Strings {
  export const teapot =
    "```\n" +
    "                       (\n" +
    "            _           ) )\n" +
    "         _,(_)._        ((\n" +
    "    ___,(_______).        )\n" +
    "  ,'__.   /       \\    /\\_\n" +
    ` /,' /  |""|       \\  /  /\n` +
    "| | |   |__|       |,'  /\n" +
    " \\`.|                  /\n" +
    "  `. :           :    /\n" +
    "    `.            :.,'\n" +
    "      `-.________,-'\n" +
    "```";

  export const coffee = "`HTTP ERR: 418 - I am a teapot`";
  export const newIssueURL =
    "https://github.com/reddit-seattle/seabot/issues/new/choose";
  export const letterkennyGif =
    "https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631";
  export const feedbackText = "See an issue? Want to request a feature?";
  export const unhandledError = "Oh no! Seabot encountered an error!";
  export const whoops = (text: string, emoji: string, bottomtext?: string) => `
    whoops
    ⊂ヽ
    　 ＼＼ ${text}
    　　 ＼( ͡° ͜ʖ ͡°)
    　　　 >　⌒ヽ
    　　　/ 　 へ＼
    　　 /　　/　＼＼${bottomtext ?? "fell out"}
    　　 ﾚ　ノ　　 ヽつ
    　　/　) )
    　 /　/|　💦 
    　(　(ヽ.　　${emoji}
    　|　|、＼
    　| 丿 ＼ ⌒)
    　| |　　) /
    ノ )　　Lﾉ
    (_／`;
}

export module Environment {
  export const DEBUG = process.env["seabotDEBUG"] == "true" || false;
  export const botToken = process.env["botToken"] || undefined;
  export const weatherAPIKey = process.env["weatherAPIKey"] || "";
  export const airQualityAPIKey = process.env["airQualityAPIKey"] || "";
  export const cosmosHost = process.env["cosmosHost"] || "";
  export const cosmosAuthKey = process.env["cosmosAuthKey"] || "";
  export const telemetryDbPath =
    process.env["TELEMETRY_DB_PATH"] || "/mnt/telemetry/telemetry.db";
  export const daysWithoutBackground =
    process.env["DAYS_WITHOUT_BACKGROUND"] ||
    "./assets/dayswithoutincident.png";
  export const trackedWords = process.env["DAYS_SINCE_MEME_TRIGGER_WORDS"];
  export const eventsChannelId = process.env["EVENTS_CHANNEL_ID"] || undefined;
  // Quote prank feature
  export const blobStorageAccount = process.env["BLOB_STORAGE_ACCOUNT"] || "";
  export const blobStorageKey = process.env["BLOB_STORAGE_KEY"] || "";
  export const claudeApiKey = process.env["CLAUDE_API_KEY"] || "";
  export const quoteDebugChannelId = process.env["QUOTE_DEBUG_CHANNEL_ID"] || "";
  export const quoteSelectionPrompt = process.env["QUOTE_SELECTION_PROMPT"] || "";
  export const geminiApiKey = process.env["GEMINI_API_KEY"] || "";
}
export module VoiceConstants {
  export const VOICE_TYPE = 2;
  export const enum Permissions {
    MOVE = "MoveMembers",
    MUTE = "MuteMembers",
    DEAFEN = "DeafenMembers",
    MANAGE_CHANNELS = "ManageChannels",
  }
}

export module ServerInfo {
  export module Valheim {
    export const serverName = "/r/Seattle valheim dedicated";
    export const ipAddress = "20.57.179.81";
    export const access = process.env["valheim_server_password"];
  }
}
