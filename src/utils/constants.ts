import { SqlQuerySpec } from "@azure/cosmos";
import dotenv from "dotenv";
dotenv.config();

export module Database {
  export const DATABASE_ID = "seabot";
  export module Containers {
    export const AWARDS = "Awards";
    export const INCIDENTS = "Incidents";
    export const TELEMETRY = "MessageTelemetry";
  }
  export module Queries {
    export const AWARDS_BY_USER = (userId: string): SqlQuerySpec => {
      return {
        query: "SELECT * FROM Awards a where a.awardedTo = @userId",
        parameters: [
          {
            name: "@userId",
            value: userId,
          },
        ],
      };
    };
    export const TELEMETRY: SqlQuerySpec = {
      query: "SELECT * FROM MessageTelemetry",
    };
    export const TELEMETRY_BY_CHANNEL = (channelId: string): SqlQuerySpec => {
      return {
        query:
          "SELECT * FROM MessageTelemetry t where t.channelId = @channelId",
        parameters: [
          {
            name: "@channelId",
            value: channelId,
          },
        ],
      };
    };
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
  export const HEX = /^[0-9A-F]{6}$/i;
}
export module Hue {
  export const HUE_GO_ID = "9";
  export const HUE_GO_UNIQUE_ID = "00:17:88:01:09:80:e5:38-0b";
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
  export module Constants {
    export const hueAccessToken = "hueAccessToken";
    export const hueRefreshToken = "hueRefreshToken";
    export const hueEnabled = "hueEnabled";
    export const telemetryEventHub = "messages";
  }
  export const DEBUG = process.env["seabotDEBUG"] == "true" || false;
  export const botToken = process.env["botToken"] || undefined;
  export const weatherAPIKey = process.env["weatherAPIKey"] || "";
  export const airQualityAPIKey = process.env["airQualityAPIKey"] || "";
  export const hueClientId = process.env["hueClientId"] || undefined;
  export const hueAppId = process.env["hueAppId"] || undefined;
  export const hueClientSecret = process.env["hueClientSecret"] || undefined;
  export const hueState = process.env["hueState"] || undefined;
  export const cosmosHost = process.env["cosmosHost"] || "";
  export const cosmosAuthKey = process.env["cosmosAuthKey"] || "";
  export const ehConnectionString = process.env["ehConnectionString"] || "";
  export const sendTelemetry = process.env["sendTelemetry"] || false;
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
