import { Message, EmbedBuilder } from "discord.js";
import commands from "..";
import { Command } from "../../Command";
import { configuration, discordBot } from "../../../server";
import { Strings } from "../../../utils/constants";
import ReactionCommands from "../../reaction";
import ReactionCommand from "../../reaction/ReactionCommand";

export default new Command({
    name: "reactions",
    help: "reactions",
    description: "Display reaction command help",
    async execute(message: Message, args?: string[]) {
        // filter admin commands to only mods
        let filteredCommands = ReactionCommands.filter(
            (command) => !command?.adminOnly || (command?.adminOnly && message.member?.roles.cache.has(configuration.roleIds.moderator))
        );

        const emojiIdMap = new Map<string, string>();

        filteredCommands.forEach(command => {
            if (emojiIdMap.has(command.name)) {
                return;
            }

            const emoji = discordBot.client.emojis.cache.find(emoji => emoji.name === command.name);
            if (emoji == undefined) {
                console.warn(`Could not find matching emoji for reaction command "${command.name}".`);
                return;
            }

            emojiIdMap.set(command.name, emoji.id);
        })

        const embed = new EmbedBuilder({
            title: `SeaBot Reaction Command Help`,
            description: "Reactions",
            color: 111111,
            fields: [
                ...filteredCommands.map((command) => {

                    return {
                        name: command.name,
                        value: `<:${command.name}:${emojiIdMap.get(command.name)}>: ${command.description}`,
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
