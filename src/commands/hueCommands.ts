import { Message } from "discord.js";
import { Command } from "../models/Command";
import { v3 as NodeHue } from "node-hue-api";
import { Environment, Hue } from "../utils/constants";
import { HueInitialize } from "../utils/helpers";

export const HueSet: Command = {
  name: "hueSet",
  help: "hueSet #5eab07",
  description: "Changes Burn's hue light to a specific hex color",
  async execute(message: Message, args?: string[]) {
    const hex = args?.[1]?.replace(/^#/, '');
    if(!hex || !RegExp('^[0-9A-F]{6}$', 'i').test(hex)) {
        message.channel.send('Please choose a valid hex color.')
        return;
    }
    const hueApi = await HueInitialize(message);
    if(hueApi) {
        const light = await hueApi.lights.getLight(Hue.HUE_GO_ID);
        if(light){
            var aRgbHex = hex.match(/.{1,2}/g);
            var aRgb = [
                parseInt(aRgbHex?.[0]!, 16),
                parseInt(aRgbHex?.[1]!, 16),
                parseInt(aRgbHex?.[2]!, 16)
            ];
            const state = new NodeHue.lightStates
              .LightState()
              .on()
              .brightness(100)
              .rgb(aRgb);
            await hueApi.lights.setLightState(Hue.HUE_GO_ID, state);

        }
    }
  },
};

export const HueInit: Command = {
  name: "hueInit",
  help: "hueInit",
  adminOnly: true,
  description: "reconnects hue service (messages you a link)",
  async execute(message: Message, args?: string[]) {
    const { hueClientId, hueClientSecret } = Environment;
    const remote = NodeHue.api.createRemote(hueClientId!, hueClientSecret!);
      message?.member?.send(
        `${remote.getAuthCodeUrl(
          "node-hue-api-remote",
          Environment.hueAppId!,
          Environment.hueState!
        )}`
      );
  },
};

export const HueEnable: Command = {
  name: "hueFeature",
  help: "hueFeature enable|disable",
  adminOnly: true,
  description: "enables or disables the hue command features",
  async execute(message: Message, args?: string[]) {
    const arg = args?.[1];
    const enabled = (arg == 'enable');
    if(arg) {
      process.env[Environment.Constants.hueEnabled] = (enabled) ? 'true' : 'false';
      message.channel.send(`Hue commands: ${enabled ? 'enabled' : 'disabled'}`)
    }
  },
};
