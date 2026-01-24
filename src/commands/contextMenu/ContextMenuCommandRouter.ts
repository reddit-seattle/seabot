import {
  Events,
  GuildMemberRoleManager,
  Interaction,
  MessageFlags,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { configuration } from "../../server";
import { Strings } from "../../utils/constants";

import CommandRouter from "../CommandRouter";
import ContextMenuCommand from "./ContextMenuCommand";

export default class ContextMenuCommandRouter extends CommandRouter {
  public async initialize(commands: ContextMenuCommand[]) {
    const commandMap = commands.reduce((map, obj) => {
      map[obj.name.toLowerCase()] = obj;
      return map;
    }, {} as ContextMenuCommandDictionary);

    async function tryToExecuteContextMenuCommand(interaction: Interaction) {
      if (
        !interaction.isUserContextMenuCommand() &&
        !interaction.isMessageContextMenuCommand()
      )
        return;

      const command = commandMap[interaction.commandName];

      if (command) {
        // mod only atm
        if (command.adminOnly) {
          const roles = interaction.member?.roles as GuildMemberRoleManager;
          if (!roles?.cache.has(configuration.roleIds.moderator)) {
            return interaction.reply({
              content: "coming soon...",
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        try {
          await command.execute?.(interaction);
        } catch (error) {
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(Strings.unhandledError);
          } else {
            await interaction.reply(Strings.unhandledError);
          }

          throw error;
        }
      }
    }

    this.eventRouter.addEventListener(
      Events.InteractionCreate,
      tryToExecuteContextMenuCommand,
    );

    // Register commands when client is ready
    this.eventRouter.addEventListener(Events.ClientReady, async () => {
      this.discordBot.client.guilds.cache.forEach(async (guild) => {
        const registeredCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
        for (const command of commands) {
          if (command?.builder) {
            registeredCommands.push(command.builder.toJSON());
          }
        }

        await this.discordBot.rest.put(
          Routes.applicationGuildCommands(
            this.discordBot.client.user?.id || "",
            guild.id,
          ),
          { body: registeredCommands },
        );
      });
    });
  }
}

interface ContextMenuCommandDictionary {
  [key: string]: ContextMenuCommand;
}
