import { Message } from "discord.js";

import { Command } from "../../../models/Command";
import { Environment } from "../../../utils/constants";

export default new Command({
    name: "hueFeature",
    help: "hueFeature enable|disable",
    adminOnly: true,
    description: "enables or disables the hue command features",
    async execute(message: Message, args?: string[]) {
        const arg = args?.[0];
        const enabled = arg == "enable";
        if (arg) {
            process.env[Environment.Constants.hueEnabled] = enabled ? "true" : "false";
            message.channel.send(`Hue commands: ${enabled ? "enabled" : "disabled"}`);
        }
    },
});
