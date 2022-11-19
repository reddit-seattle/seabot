import { Message, EmbedBuilder } from "discord.js";
import { Command } from "../../../models/Command";
import { Config, RoleIds, Strings } from "../../../utils/constants";
import commands from "../";

export default new Command({
    name: "help",
    help: "help",
    description: "Display SeaBot command help",
    execute: (message: Message, args?: string[]) => {
        // filter admin commands to only mods
        let filteredCommands = commands.filter(
            (command) => !command?.adminOnly || (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );

        // try only showing help for a single command if the user specifies one that matches
        const argCommand = filteredCommands.find((command) => command.name.toLowerCase() == args?.[0]?.toLowerCase());
        if (argCommand) {
            filteredCommands = [argCommand];
        }

        const embed = new EmbedBuilder({
            title: `SeaBot Help`,
            description: "Commands",
            color: 111111,
            fields: [
                ...filteredCommands.map((command) => {
                    return {
                        name: command.name,
                        value: `${command.description}\nExample: ${Config.prefix}${command.help}`,
                        inline: false,
                    };
                }),
                {
                    name: Strings.feedbackText,
                    inline: false,
                    value: Strings.newIssueURL,
                },
            ],
        });
        message.channel.send({ embeds: [embed] });
    },
});
