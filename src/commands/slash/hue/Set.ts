import { Message, SlashCommandBuilder } from "discord.js";
import { v3 as NodeHue } from "node-hue-api";

import SlashCommand from "../SlashCommand";

import { Hue } from "../../../utils/constants";
import { HueInitialize } from "../../../utils/helpers";

export default new SlashCommand({
    name: "hueSet",
    help: "hueSet #5eab07",
    description: "Changes Burn's hue light to a specific hex color",
    builder: new SlashCommandBuilder(),
    async execute(message: Message, args?: string[]) {
        const hueApi = await HueInitialize(message);
        if (hueApi) {
            const light = await hueApi.lights.getLight(Hue.HUE_GO_ID);
            if (light) {
                const hex = args?.[0]?.replace(/^#/, "");
                if (!hex || !RegExp("^[0-9A-F]{6}$", "i").test(hex)) {
                    message.channel.send("Please choose a valid hex color.");
                    return;
                }
                var aRgbHex = hex.match(/.{1,2}/g);
                var aRgb = [parseInt(aRgbHex?.[0]!, 16), parseInt(aRgbHex?.[1]!, 16), parseInt(aRgbHex?.[2]!, 16)];
                const state = new NodeHue.lightStates.LightState().on().brightness(100).rgb(aRgb);
                await hueApi.lights.setLightState(Hue.HUE_GO_ID, state);
            }
        }
    },
});
