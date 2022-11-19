import { Message, EmbedBuilder } from "discord.js";
import { Command } from "../../models/Command";
import { RoleIds, Strings } from "../../utils/constants";
import ReactionCommands from "../reactions";

export default new Command({
    name: "reactions",
    help: "reactions",
    description: "Display reaction command help",
    async execute(message: Message, args?: string[]) {
        // filter admin commands to only mods
        let filteredCommands = ReactionCommands.filter(
            (command) => !command?.adminOnly || (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );

        const embed = new EmbedBuilder({
            title: `SeaBot Reaction Command Help`,
            description: "Reactions",
            color: 111111,
            fields: [
                ...filteredCommands.map((command) => {
                    return {
                        name: command.name,
                        value: `<:${command.name}:${command.emojiId}>: ${command.description}`,
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
