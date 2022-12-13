import { Message, SlashCommandBuilder } from "discord.js";
import { v3 as NodeHue } from "node-hue-api";

import SlashCommand from "../SlashCommand";

import { Environment } from "../../../utils/constants";

export default new SlashCommand({
  name: "hueInit",
  help: "hueInit",
  adminOnly: true,
  description: "reconnects hue service (messages you a link)",
  builder: new SlashCommandBuilder(),
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
});
