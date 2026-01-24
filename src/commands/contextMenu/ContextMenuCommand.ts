import { ContextMenuCommandBuilder } from "discord.js";
import { Command, CommandConfiguration } from "../Command";

export type ContextMenuCommandHandler = (...args: any[]) => any;

export interface ContextMenuCommandConfiguration extends CommandConfiguration {
  builder: ContextMenuCommandBuilder;
  execute: ContextMenuCommandHandler;
}

export default class ContextMenuCommand extends Command {
  private _configuration: ContextMenuCommandConfiguration;

  public get builder() {
    return this._configuration.builder;
  }

  constructor(configuration: ContextMenuCommandConfiguration) {
    super(configuration);
    this._configuration = configuration;
    this._configuration.builder.setName(this.name);
  }

  public canExecute() {
    return true;
  }

  public execute(...args: any[]) {
    return this._configuration.execute?.call(this, ...args);
  }
}
