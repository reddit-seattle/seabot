import { Message, MessageReaction, PartialMessage, PartialMessageReaction, PartialUser, User } from "discord.js"
import { Config, Environment, REGEX, RoleIds } from "./constants";
import { v3 as NodeHue } from 'node-hue-api';
import { now } from "moment";

/**
 * Splits message content into an array of arguments by spaces.
 * Includes the actual command arg (without prefix) as the first element.
 * @param message The discord message to parse
 * @returns A string array of [command_arg, arg1, arg2, ...]
 */
export const SplitMessageIntoArgs: (message: Message) => string[] = (message) => {
    return message.content.slice(Config.prefix.length).trim().split(' ');
}

// credit: Typescript documentation, src 
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
}

export const replaceMentions: (message: Message | PartialMessage) => string = (message) => {
    let { content } = message;
    content = content ? content : '';

    const userMatches = Array.from(content.matchAll(REGEX.USER));
    const roleMatches = Array.from(content.matchAll(REGEX.ROLE));
    const channelMatches = Array.from(content.matchAll(REGEX.CHANNEL));
    const emojiMatches = Array.from(content.matchAll(REGEX.EMOJI));

    userMatches.forEach((match, ix) => {
        const id = match[1] as `${bigint}`;
        const username = message.client.users.cache.get(id)?.username ?? 'user';
        content = content!.replace(match[0], username);
    });
    roleMatches?.forEach((match, ix) => {
        const id = match[1] as `${bigint}`;
        const role = message.guild?.roles.cache.get(id)?.name ?? 'role';
        content = content!.replace(match[0], role);
    });
    channelMatches?.forEach((match, ix) => {
        const id = match[1] as `${bigint}`;
        const channel = message.guild?.channels.cache.get(id)?.name ?? 'channel';
        content = content!.replace(match[0], channel);
    });
    emojiMatches?.forEach((match, ix) => {
        const id = match[1] as `${bigint}`;
        const emoji = message.guild?.emojis.cache.get(id)?.name ?? 'emoji';
        content = content!.replace(match[0], emoji);
    });
    return content;
}

export interface SetHueTokenResult {
    success: boolean;
    error?: any;
}

export const SetHueTokens = async (code: string): Promise<SetHueTokenResult> => {
    try {
        const { hueClientId, hueClientSecret } = Environment;
        const remote = NodeHue.api.createRemote(hueClientId!, hueClientSecret!);
        const api = await remote.connectWithCode(code);
        const remoteCredentials = api?.remote?.getRemoteAccessCredentials();
        process.env[Environment.Constants.hueAccessToken] = remoteCredentials?.tokens?.access?.value;
        process.env[Environment.Constants.hueRefreshToken] = remoteCredentials?.tokens?.refresh?.value;
        return {
            success: true
        };
    }
    catch(e: any) {
        console.dir(e);
        return {
            success: false,
            error: e
        }
    }
}

export const HueInitialize = async (message: Message) => {
    const { hueClientId, hueClientSecret, Constants } = Environment;
    const enabled = process.env[Environment.Constants.hueEnabled] == 'true';
    if(!enabled) {
        message.channel.send('Hue commands are currently disabled. Ask burn to turn them on pretty please');
        return;
    }
    const hueAccessToken = process.env[Constants.hueAccessToken];
    const hueRefreshToken = process.env[Constants.hueRefreshToken];
    const remote = NodeHue.api.createRemote(hueClientId!, hueClientSecret!);
    if(hueAccessToken && hueRefreshToken) {
        try{
          let api = await remote.connectWithTokens(hueAccessToken, hueRefreshToken);
          const { tokens } = api.remote?.getRemoteAccessCredentials()!;
          //check for expiry
          if(tokens?.access?.expiresAt! < (Date.now() + 2000)) {
              const { accessToken, refreshToken } = await api.remote?.refreshTokens()!;
              process.env[Constants.hueAccessToken] = accessToken?.value;
              process.env[Constants.hueRefreshToken] = refreshToken?.value;
              api = await remote.connectWithTokens(accessToken!.value, refreshToken!.value);
          }
          return api;
          
        }
        catch(e: any) {
          console.dir(e);
          message.channel.send("Error connecting with access tokens, Burn may need to run `$hueInit`.");
        }
    }
};

export const toSarcasticCase = (text: string) => {
    const chars = text.split('');
    let charAt = 0;
    return chars.map((char) => {
        if (char.match(/[a-zA-Z]/)) {
            return ++charAt % 2 == 1 ? char.toLowerCase(): char.toUpperCase();
        }
        return char;
    }).join('');
}

export const pullTimeStampsFromApolloString = (timestring: string) => {
    const startStr = timestring.match('<t:([0-9]*):F>')?.[1];
    const endStr = timestring.match('<t:([0-9]*):t>')?.[1];
    const start = startStr ? (parseInt(startStr) * 1000) : now();
    //if no end - default to one hour
    const end = endStr ? (parseInt(endStr) * 1000) : start + (60 * 60 * 1000);
    return { start, end };
}

export const parseApolloMarkdownLink = (apolloLink: string) => {
    const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/;
    const parsed = apolloLink.match(markdownLinkRegex)
    return {
        title: parsed?.[1],
        url: parsed?.[2]
    }
}

export const isModReaction = (reacc: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
    const guildUser = reacc.message.guild?.members.cache.get(user.id);
    return guildUser?.roles.cache.has(RoleIds.MOD) ?? false;
}