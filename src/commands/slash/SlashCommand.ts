import {ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder} from "discord.js";
import {Command, CommandConfiguration} from "../Command";

export type SlashCommandBuilderSet = SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface SlashCommandConfiguration extends CommandConfiguration {
    builder: SlashCommandBuilderSet | (() => SlashCommandBuilderSet);
    execute: (_: ChatInputCommandInteraction) => Promise<void>;
}

export default class SlashCommand extends Command {
  private _configuration: SlashCommandConfiguration;

    public get builder() {
        return this._configuration.builder as SlashCommandBuilderSet;
    }

    constructor(configuration: SlashCommandConfiguration) {
        super(configuration);
        this._configuration = configuration;
        this.initialize();
    }

    private async initialize() {
        let builtSlashCommand : SlashCommandBuilderSet;
        if (typeof this._configuration.builder === "function") {
            builtSlashCommand = await this._configuration.builder();
        } else {
            builtSlashCommand = this._configuration.builder
        }

        this._configuration.builder = builtSlashCommand.setName(this.name.toLowerCase()).setDescription(this.description);
    }

    public canExecute() {
        return true;
    }

    public execute(interaction: ChatInputCommandInteraction) {
        return this._configuration.execute?.call(this, interaction);
    }
}
