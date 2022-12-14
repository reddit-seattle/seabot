import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { v3 as NodeHue } from "node-hue-api";

import SlashCommand from "../SlashCommand";

import { Hue, REGEX } from "../../../utils/constants";
import { HueInitialize } from "../../../utils/helpers";

export default new SlashCommand({
  name: "hueSet",
  help: "hueSet #5eab07",
  description: "Changes Burn's hue light to a specific hex color",
  adminOnly: true,
  builder: new SlashCommandBuilder().addStringOption((option) => {
    return option
      .setName("color")
      .setDescription("Hex color code")
      .setRequired(true);
  }),
  async execute(interaction: ChatInputCommandInteraction) {
    const hueApi = await HueInitialize(interaction);
    if (hueApi) {
      const light = await hueApi.lights.getLight(Hue.HUE_GO_ID);
      if (light) {
        const color = await interaction.options.getString("color", true);
        const hex = color?.[0]?.replace(/^#/, "");
        if (!hex || !REGEX.HEX.test(hex)) {
          await interaction.editReply("Please choose a valid hex color.");
          return;
        }
        const aRgbHex = hex.match(/.{1,2}/g);
        if (!aRgbHex?.[3]) {
          return;
        }
        const aRgb = [
          parseInt(aRgbHex[0], 16),
          parseInt(aRgbHex[1], 16),
          parseInt(aRgbHex[2], 16),
        ];
        const state = new NodeHue.lightStates.LightState()
          .on()
          .brightness(100)
          .rgb(aRgb);
        await hueApi.lights.setLightState(Hue.HUE_GO_ID, state);
        await interaction.editReply(`Color changed to ${color}`);
      }
    }
  },
});
