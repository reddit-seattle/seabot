import { EmbedBuilder, GuildMemberRoleManager } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { Config, Strings } from "../../../utils/constants";
import { configuration } from "../../../server";

export default new SlashCommand({
  name: "help",
  help: "help",
  description: "Display SeaBot command help",
  builder: () =>
    new ChatInputCommandBuilder().addStringOptions([
      (option) => {
        option.setName("command");
        option.setDescription("The command you would like help with");
        return option;
      },
    ]),
  execute: async (interaction) => {
    // filter admin commands to only mods
    const roles = interaction.member?.roles as GuildMemberRoleManager;
    const commands: SlashCommand[] = await (await import("../")).default;
    let filteredCommands = commands
      .filter(
        (command) =>
          !command?.adminOnly ||
          (command?.adminOnly &&
            roles.cache.has(configuration.roleIds.moderator)),
      )
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const commandName = interaction.options
      .getString("command")
      ?.toLowerCase()
      .trim();
    if (commandName) {
      const foundCommand = filteredCommands.find(
        (x) => x.name.toLowerCase() === commandName,
      );
      if (foundCommand) {
        filteredCommands = [foundCommand];
      } else {
        interaction.reply(`Command "${commandName}" does not exist.`);
      }
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
    interaction.reply({ embeds: [embed] });
  },
});
