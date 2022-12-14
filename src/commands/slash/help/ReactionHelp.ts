import {
  Message,
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

import ReactionCommands from "../../reaction";
import SlashCommand from "../SlashCommand";

import { configuration, discordBot } from "../../../server";
import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "reactions",
  help: "reactions",
  description: "Display reaction command help",
  builder: new SlashCommandBuilder().addStringOption((option) =>
    option
      .setName("command")
      .setDescription("The command you would like help with")
  ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    // filter admin commands to only mods
    const filteredCommands = ReactionCommands.filter(
      (command) =>
        !command?.adminOnly ||
        (command?.adminOnly &&
          interaction.member?.roles &&
          interaction.inCachedGuild() &&
          interaction.member?.roles.cache.has(configuration.roleIds.moderator))
    );

    const emojiIdMap = new Map<string, string>();

    filteredCommands.forEach((command) => {
      if (emojiIdMap.has(command.name)) {
        return;
      }

      const emoji = discordBot.client.emojis.cache.find(
        (emoji) => emoji.name === command.name
      );
      if (emoji == undefined) {
        console.warn(
          `Could not find matching emoji for reaction command "${command.name}".`
        );
        return;
      }

      emojiIdMap.set(command.name, emoji.id);
    });

    const embed = new EmbedBuilder({
      title: `SeaBot Reaction Command Help`,
      description: "Reactions",
      color: 111111,
      fields: [
        ...filteredCommands.map((command) => {
          return {
            name: command.name,
            value: `<:${command.name}:${emojiIdMap.get(command.name)}>: ${
              command.description
            }`,
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
    interaction.channel?.send({ embeds: [embed] });
  },
});
