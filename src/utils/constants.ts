import dotenv from 'dotenv';
dotenv.config();

export module Endpoints {
    export const currentWeatherURL = 'https://api.openweathermap.org/data/2.5/weather'
    export const weatherForecastURL = 'https://api.openweathermap.org/data/2.5/forecast';
    export module Quotes {
        export const Swanson = 'https://ron-swanson-quotes.herokuapp.com/v2/quotes';
        // this is authenticated and therefore currently useless.
        export const Ub3r_B0t = 'https://admin.ub3r-b0t.com/api/quotes/370945003566006272';
        export const Image = (size: number) => `https://picsum.photos/${size}`;
    }
}

export module Config {
    export const prefix = '$';
}

export module Constants {
    export module Quotes {
        export const ImageSize = 800;
        export const TextMargin = 100;
    }
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

export module Environment {
    export const botToken = process.env['botToken'] || undefined;
    export const DEBUG = process.env['seabotDEBUG'] || undefined;
    export const weatherAPIKey = process.env['weatherAPIKey'] || undefined;
}
export module VoiceConstants {
    export const groupName = 'user-voice-channels'
    export const VOICE_TYPE = 'voice';
    export const enum Permissions {
        MOVE = 'MOVE_MEMBERS',
        MUTE = 'MUTE_MEMBERS',
        DEAFEN = 'DEAFEN_MEMBERS'
    }
}

export module ServerInfo {
    export module Valheim  {
        export const serverName = '/r/Seattle valheim dedicated';
        export const ipAddress = '20.57.179.81';
        export const access = process.env['valheim_server_password']
    }
}