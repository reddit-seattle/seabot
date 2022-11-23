import { SlashCommandBuilder, ChatInputCommandInteraction, Message } from "discord.js";

export type SlashCommandHandler = (interaction: ChatInputCommandInteraction) => any;
export type SlashCommandResult = () => Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface CommandConfiguration {
    name: string;
    emojiName?: string;
    description: string;
    help: string;
    slashCommandDescription?: SlashCommandResult;
    executeSlashCommand?: SlashCommandHandler;
    adminOnly?: boolean;
    execute?: Function;
}

//TODO - expand interface to have a 'canExecute' method to check args and return help message
export class Command {
    private _name: string;
    public get name() { return this._name; }
    private _adminOnly = true;
    public get adminOnly() { return this._adminOnly; }
    private _description: string;
    public get description() { return this._description; }
    private _help: string;
    public get help() { return this._help; }
    private _slashCommandDescription?: SlashCommandResult;
    async slashCommandDescription() { return await this._slashCommandDescription?.call(this); }
    private _executeSlashCommand?: SlashCommandHandler;
    async executeSlashCommand(interaction: ChatInputCommandInteraction) { return await this._executeSlashCommand?.call(this, interaction); }
    private _execute?: Function;
    get execute() { return this._execute; }

    constructor(configuration: CommandConfiguration) {
        this._name = configuration.name;
        this._description = configuration.description;
        this._help = configuration.help;
        this._adminOnly = configuration.adminOnly ?? false;
        this._slashCommandDescription = configuration.slashCommandDescription ?? undefined;
        this._executeSlashCommand = configuration.executeSlashCommand ?? undefined;
        this._execute = configuration.execute;
    }
    
}

export interface CommandDictionary { [id: string]: Command }