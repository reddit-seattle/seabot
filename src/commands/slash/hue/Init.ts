import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { v3 as NodeHue } from "node-hue-api";

import SlashCommand from "../SlashCommand";

import { Environment } from "../../../utils/constants";

export default new SlashCommand({
  name: "hueInit",
  help: "hueInit",
  adminOnly: true,
  description: "reconnects hue service (messages you a link)",
  builder: new SlashCommandBuilder(),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const { hueClientId, hueClientSecret, hueAppId, hueState } = Environment;
    // !all([]) doesn't typeguard the undefineds so we're left with this mess
    if (!hueClientId || !hueClientSecret || !hueAppId || !hueState) {
      await interaction.editReply(
        "Hue environment variables are incorrectly configured."
      );
      return;
    }
    const remote = NodeHue.api.createRemote(hueClientId, hueClientSecret);
    await interaction.editReply(
      `${remote.getAuthCodeUrl("node-hue-api-remote", hueAppId, hueState)}`
    );
  },
});
