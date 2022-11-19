import { Message } from "discord.js";
import { v3 as NodeHue } from "node-hue-api";

import { Command } from "../../../models/Command";
import { Environment } from "../../../utils/constants";

export default new Command({
    name: "hueInit",
    help: "hueInit",
    adminOnly: true,
    description: "reconnects hue service (messages you a link)",
    async execute(message: Message, args?: string[]) {
        const { hueClientId, hueClientSecret } = Environment;
        const remote = NodeHue.api.createRemote(hueClientId!, hueClientSecret!);
        message?.member?.send(
            `${remote.getAuthCodeUrl("node-hue-api-remote", Environment.hueAppId!, Environment.hueState!)}`
        );
    },
});
