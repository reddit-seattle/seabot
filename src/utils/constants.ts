import dotenv from 'dotenv';
dotenv.config();

export module Endpoints {
    export const currentWeatherURL = 'https://api.openweathermap.org/data/2.5/weather'
    export const dailyForecastURL = 'https://api.openweathermap.org/data/2.5/forecast';
    export const weeklyForecastURL = 'https://api.openweathermap.org/data/2.5/forecast/daily';
    export const geocodingDirectURL = 'http://api.openweathermap.org/geo/1.0/direct';
    export const geocodingReverseURL = 'http://api.openweathermap.org/geo/1.0/reverse';
    export const airQualityForecastByZipURL = 'https://www.airnowapi.org/aq/forecast/zipCode/';
    export const airQualityCurrentByZipURL = 'https://www.airnowapi.org/aq/observation/zipCode/current';
}
export module Hue {
    export const HUE_GO_ID = '9';
    export const HUE_GO_UNIQUE_ID = '00:17:88:01:09:80:e5:38-0b';
}
export module Config {
    export const prefix = '$';
}
export module RoleIds {
    export const MOD = '370946173902520342';
}
export module ChannelIds {
    export const RANT = '804639001226379294';
    export const VOICE_CREATE = '788552426906845185';
    export const USER_VOICE_GROUP = '788552301182320640';
    export const DEBUG = '541322708844281867';
}

export module AppConfiguration {
    export const BOT_RELEASE_VERSION = process.env['botReleaseVersion'] || undefined;
    export const BOT_RELEASE_REASON = process.env['botReleaseReason'] || undefined;
    export const BOT_RELEASE_DESCRIPTION = process.env['botReleaseDescription'] || undefined;
    export const BOT_RELEASE_COMMIT = process.env['botReleaseCommit'] || undefined;
}
export module Strings {
    export const teapot =
        "```\n" +
        '                       (\n' +
        '            _           ) )\n' +
        '         _,(_)._        ((\n' +
        "    ___,(_______).        )\n" +
        "  ,'__.   /       \\    /\\_\n" +
        ` /,' /  |""|       \\  /  /\n` +
        "| | |   |__|       |,'  /\n" +
        " \\`.|                  /\n" +
        "  `. :           :    /\n" +
        "    `.            :.,'\n" +
        "      `-.________,-'\n" +
        "```";

    export const coffee = '`HTTP ERR: 418 - I am a teapot`';
    export const newIssueURL = 'https://github.com/reddit-seattle/seabot/issues/new/choose';
    export const feedbackText = 'See an issue? Want to request a feature?';
}

export module Emoji {
    export module RJ {
        export const rj = '<:rj:907523806149632070>';
        export const rj2 = '<:rj2:907524086811492364>';
        export const rj3 = '<:rj3:907524275936837652>';
        export const rj4 = '<:rj4:907525187401035778>';
        export const partyrj = '<a:partyrj:908213205409619968>';

    }
    export const tsktsk = '<a:tsktsk:907698722635399218>';
    export const fingerguns = '<:fingerguns:901378901908017152>';
    export const krakenjersey = '<:krakenjersey:882102376385900564>';
    export const ohno = '<:ohno:774349924841553940>';
    export const ohnoreverse = '<:ohnoreverse:904473411026292827>';
    export const lachancla = '<:lachancla:852649414698729493>';
}

export module Environment {
    export module Constants {
        export const hueAccessToken = 'hueAccessToken';
        export const hueRefreshToken = 'hueRefreshToken'
        export const hueEnabled = 'hueEnabled'
    }
    export const botToken = process.env['botToken'] || undefined;
    export const DEBUG = process.env['seabotDEBUG'] || undefined;
    export const weatherAPIKey = process.env['weatherAPIKey'] || undefined;
    export const airQualityAPIKey = process.env['airQualityAPIKey'] || undefined;
    export const hueClientId = process.env['hueClientId'] || undefined;
    export const hueAppId = process.env['hueAppId'] || undefined;
    export const hueClientSecret = process.env['hueClientSecret'] || undefined;
    export const hueState = process.env['hueState'] || undefined;
}
export module VoiceConstants {
    export const VOICE_TYPE = 2;
    export const enum Permissions {
        MOVE = 'MOVE_MEMBERS',
        MUTE = 'MUTE_MEMBERS',
        DEAFEN = 'DEAFEN_MEMBERS',
        MANAGE_CHANNELS = 'MANAGE_CHANNELS'
    }
}

export module ServerInfo {
    export module Valheim  {
        export const serverName = '/r/Seattle valheim dedicated';
        export const ipAddress = '20.57.179.81';
        export const access = process.env['valheim_server_password']
    }
}
