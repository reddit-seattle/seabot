import { Message } from "discord.js"
import { Config, Environment } from "./constants";
import { v3 as NodeHue } from 'node-hue-api';

export const GetMessageArgs: (message: Message) => string[] = (message) => {
    return message.content.slice(Config.prefix.length).trim().split(' ');
}

// credit: Typescript documentation, src 
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
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