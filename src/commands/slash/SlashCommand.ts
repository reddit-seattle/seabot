import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import { FunctionType } from "../../utils/types";
import { Command, CommandConfiguration } from "../Command";
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    return this._configuration.builder as BuiltSlashCommand;
  }

  constructor(configuration: SlashCommandConfiguration) {
    super(configuration);
    this._configuration = configuration;
    this.initialize();
  }

        if (typeof builder === "function") {
            if (builder.constructor.name === "AsyncFunction") {
                builder = await (this._configuration.builder as FunctionType<void>)();
            } else {
                builder = (this._configuration.builder as FunctionType<void>)();
            }

    if (typeof builder === "function") {
      if (builder.constructor.name === "AsyncFunction") {
        builder = await (this._configuration.builder as Function)();
      } else {
        builder = (this._configuration.builder as Function)();
      }

      this._configuration.builder = builder;
    }

    public canExecute() {
        return true;
    }

  public canExecute(...args: any[]) {
    return true;
  }

  public execute(...args: any[]) {
    return this._configuration.execute?.call(this, ...args);
  }
}
