import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";

import { Command, CommandConfiguration } from "../Command";

export type SlashCommandHandler = (...args: any[]) => any;
export type BuiltSlashCommand =
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface SlashCommandConfiguration extends CommandConfiguration {
    builder: BuiltSlashCommand | (() => BuiltSlashCommand);
    execute: SlashCommandHandler;
}

export default class SlashCommand extends Command {
    private _configuration: SlashCommandConfiguration;

    public get builder() {
        return this._configuration.builder;
    }

    constructor(configuration: SlashCommandConfiguration) {
        super(configuration);
        this._configuration = configuration;
        this.initialize();
    }

    private async initialize() {
        let builder = this.builder as any;

        if (typeof builder === "function") {
            if (builder.constructor.name === "AsyncFunction") {
                builder = await (this.builder as Function)();
            } else {
                builder = (this.builder as Function)();
            }
            this._configuration.builder = builder;
        }

        builder.setName(this._configuration.name.toLowerCase());
        builder.setDescription(this._configuration.description);
    }

    public canExecute(...args: any[]) {
        return true;
    }

    public execute(...args: any[]) {
        return this._configuration.execute?.call(this, ...args);
    }
}
