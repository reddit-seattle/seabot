import { SqlQuerySpec } from '@azure/cosmos';
import { ApplicationCommandPermissionData } from 'discord.js';
import { ApplicationCommandPermissionTypes } from 'discord.js/typings/enums';
import dotenv from 'dotenv';
dotenv.config();

export module Database {
    export const DATABASE_ID = 'seabot';
    export module Containers {
        export const AWARDS = 'Awards';
        export const INCIDENTS = 'Incidents';
        export const CONFIGS = 'Configs';
    }
    export module Queries {
        export const AWARDS_BY_USER = (userId: string): SqlQuerySpec => {
            return {
                query: 'SELECT * FROM Awards a where a.awardedTo = @userId',
                parameters: [
                    {
                        name: '@userId',
                        value: userId
                    }
                ]
            }
        }
    }
}

export module Endpoints {
    export const currentWeatherURL = 'https://api.openweathermap.org/data/2.5/weather'
    export const dailyForecastURL = 'https://api.openweathermap.org/data/2.5/forecast';
    export const weeklyForecastURL = 'https://api.openweathermap.org/data/2.5/forecast/daily';
    export const geocodingDirectURL = 'http://api.openweathermap.org/geo/1.0/direct';
    export const geocodingReverseURL = 'http://api.openweathermap.org/geo/1.0/reverse';
    export const airQualityForecastByZipURL = 'https://www.airnowapi.org/aq/forecast/zipCode/';
    export const airQualityCurrentByZipURL = 'https://www.airnowapi.org/aq/observation/zipCode/current';
}

export module REGEX {
    export const EMOJI = /<a?:.[^:]+:(\d+)>/g;
    export const ROLE = /<@&(\d+)>/g;
    export const CHANNEL = /<#(\d+)>/g;
    export const USER = /<@!(\d+)>/g;
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
    export const EVERYONE = '370945003566006272';
}
export module ChannelIds {
    export const RANT = '804639001226379294';
    export const VOICE_CREATE = '788552426906845185';
    export const USER_VOICE_GROUP = '788552301182320640';
    export const DEBUG = '541322708844281867';
    export const HALL_OF_SHAME='932533757636902912';
    export const MOD_LOG = '634526832816816128';
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
    export const whoops = (text: string, emoji: string) => `
    whoops
    ⊂ヽ
    　 ＼＼ ${text}
    　　 ＼( ͡° ͜ʖ ͡°)
    　　　 >　⌒ヽ
    　　　/ 　 へ＼
    　　 /　　/　＼＼fell out
    　　 ﾚ　ノ　　 ヽつ
    　　/　) )
    　 /　/|　💦 
    　(　(ヽ.　　${emoji}
    　|　|、＼
    　| 丿 ＼ ⌒)
    　| |　　) /
    ノ )　　Lﾉ
    (_／`
}

export module EmojiIDs {
    export const LMGTFY = '912904317848133692';
    export const GOOGLE = '912890880875200532';
    export const LACHANCLA = '852649414698729493';
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
    export const stupidsponge = '<:stupidsponge:627172014548975626>';
    export const bisbopt = '<:bisbopt:932884278214266910>';
}

export module Environment {
    export module Constants {
        export const hueAccessToken = 'hueAccessToken';
        export const hueRefreshToken = 'hueRefreshToken'
        export const hueEnabled = 'hueEnabled'
    }
    export const botToken = process.env['botToken'] || undefined;
    export const DEBUG = process.env['seabotDEBUG'] || undefined;
    export const weatherAPIKey = process.env['weatherAPIKey'] || '';
    export const airQualityAPIKey = process.env['airQualityAPIKey'] || '';
    export const hueClientId = process.env['hueClientId'] || undefined;
    export const hueAppId = process.env['hueAppId'] || undefined;
    export const hueClientSecret = process.env['hueClientSecret'] || undefined;
    export const hueState = process.env['hueState'] || undefined;
    export const cosmosHost = process.env['cosmosHost'] || '';
    export const cosmosAuthKey = process.env['cosmosAuthKey'] || '';
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

export module SlashCommandRoleConfigs {
    export const MOD_ONLY: ApplicationCommandPermissionData[] = [{
            id: RoleIds.MOD,
            type: ApplicationCommandPermissionTypes.ROLE,
            permission: true,
        },
        {
            id: RoleIds.EVERYONE,
            type: ApplicationCommandPermissionTypes.ROLE,
            permission: false,
        }]
}
