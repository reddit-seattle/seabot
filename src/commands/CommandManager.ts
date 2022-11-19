import { Client, Interaction, REST } from "discord.js";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v9";
import SlashCommands from "./slash";
import { CommandDictionary } from "../models/Command";

export default class CommandManager {
    private _client: Client;
    private _restApi: REST;
    private _commands: CommandDictionary;

    constructor(client: Client, restApi: REST) {
        this._client = client;
        this._restApi = restApi;

        this.registerAllSlashCommands();
        this._commands = SlashCommands.reduce((map, obj) => {
            map[obj.name.toLowerCase()] = obj;
            return map;
        }, {} as CommandDictionary);

        client.on("interactionCreate", this.tryToExecuteSlashCommand.bind(this));
    }

    private async tryToExecuteSlashCommand(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = this._commands[interaction.commandName];
        if (command) {
            command.executeSlashCommand?.(interaction);
        }
    }

    private async registerAllSlashCommands() {
        this._client.guilds.cache.forEach(async (guild) => {
            const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
            for (const commandName in SlashCommands) {
                const command = SlashCommands[commandName];
                if (command?.slashCommandDescription) {
                    console.log(`adding ${command.name} slash command registration`);
                    const desc = await command.slashCommandDescription();
                    if (desc) {
                        slashCommands.push(desc.toJSON());
                    }
                }
            }
            const result = await this._restApi.put(Routes.applicationGuildCommands(this._client.user!.id, guild.id), {
                body: slashCommands,
            });
            console.dir(result);
        });
    }
}
