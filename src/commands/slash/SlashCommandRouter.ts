import { Events, Interaction, RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord.js";

import CommandRouter from "../CommandRouter";
import SlashCommand from "./SlashCommand";

import { BuiltSlashCommand } from "./SlashCommand";

export default class SlashCommandRouter extends CommandRouter {
    public async initialize(commands: SlashCommand[]) {
        const commandMap = commands.reduce((map, obj) => {
            map[obj.name.toLowerCase()] = obj;
            return map;
        }, {} as SlashCommandDictionary);

        async function tryToExecuteSlashCommand(interaction: Interaction) {
            if (!interaction.isChatInputCommand()) return;

            const command = commandMap[interaction.commandName];
            if (command) {
                command.execute?.(interaction);
            }
        }

        this.eventRouter.addEventListener(Events.InteractionCreate, tryToExecuteSlashCommand);

        this.discordBot.client.guilds.cache.forEach(async (guild) => {
            const registeredCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
            for (const commandName in commands) {
                const command = commands[commandName];
                if (command?.builder) {
                    registeredCommands.push((command.builder as BuiltSlashCommand).toJSON());
                }
            }

            await this.discordBot.rest.put(Routes.applicationGuildCommands(this.discordBot.client.user!.id, guild.id), {
                body: registeredCommands,
            });
        });
    }
}

interface SlashCommandDictionary {
    [id: string]: SlashCommand;
}