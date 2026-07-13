import {
  Events,
  Interaction,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";
import { Environment, Strings } from "../../utils/constants";

import CommandRouter from "../CommandRouter";
import SlashCommand from "./SlashCommand";
import { configuration, expressServer } from "../../server";

// Option names whose values must never appear in debug output
const SENSITIVE_OPTION_NAMES = new Set(["password"]);

function redactOptions(options: readonly any[]): any[] {
  return options.map((opt) => ({
    ...opt,
    value: SENSITIVE_OPTION_NAMES.has(opt.name) ? "[redacted]" : opt.value,
    options: opt.options ? redactOptions(opt.options) : undefined,
  }));
}

export default class SlashCommandRouter extends CommandRouter {
  public async initialize(commands: SlashCommand[]) {
    const commandMap = commands.reduce((map, obj) => {
      map[obj.name.toLowerCase()] = obj;
      return map;
    }, {} as SlashCommandDictionary);

    async function tryToExecuteSlashCommand(interaction: Interaction) {
      if (!interaction.isChatInputCommand()) return;

      const command = commandMap[interaction.commandName];
      const { options, guild } = interaction;

      // Extract subcommand if present
      let subcommand: string | null = null;
      try {
        subcommand = interaction.options.getSubcommand();
      } catch {
        // No subcommand, that's fine
      }

      if (command) {
        try {
          await command.execute?.(interaction);
          // yay
          const telemetry = expressServer.getTelemetry();
          if (telemetry && command.telemetry) {
            telemetry.logCommand(
              interaction.channelId,
              interaction.commandName,
              true,
              subcommand || undefined,
            );
          }
        } catch (error) {
          // boo
          const telemetry = expressServer.getTelemetry();
          if (telemetry && command.telemetry) {
            telemetry.logCommand(
              interaction.channelId,
              interaction.commandName,
              false,
              subcommand || undefined,
            );
          }

          if (Environment.DEBUG && configuration?.channelIds?.["DEBUG"]) {
            const debugChannel = await guild?.channels.fetch(
              configuration?.channelIds?.["DEBUG"],
            );
            if (debugChannel?.isTextBased()) {
              await debugChannel.send(`
                Error while handling command \`${command.name}\`.
                Options:
                ${JSON.stringify(redactOptions(options.data))}
                Error:
                ${error}
              `);
            }
          }
          if (interaction.replied) {
            interaction.editReply(Strings.unhandledError);
          } else {
            interaction.reply(Strings.unhandledError);
          }

          throw error;
        }
      }
    }

    this.eventRouter.addEventListener(
      Events.InteractionCreate,
      tryToExecuteSlashCommand,
    );

    const registeredCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
    for (const commandName in commands) {
      const command = commands[commandName];
      if (command?.builder) {
        registeredCommands.push(command.builder.toJSON());
      }
    }

    const results = await Promise.allSettled(
      this.discordBot.client.guilds.cache.map((guild) =>
        this.discordBot.rest.put(
          Routes.applicationGuildCommands(
            this.discordBot.client.user?.id || "",
            guild.id,
          ),
          {
            body: registeredCommands,
          },
        ),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Failed to register guild commands:", result.reason);
      }
    }
  }
}

interface SlashCommandDictionary {
  [id: string]: SlashCommand;
}
