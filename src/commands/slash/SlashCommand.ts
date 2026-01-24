import { ChatInputCommandBuilder } from "@discordjs/builders";

import { Command, CommandConfiguration } from "../Command";

export type SlashCommandHandler = (...args: any[]) => any;

export interface SlashCommandConfiguration extends CommandConfiguration {
  builder: ChatInputCommandBuilder;
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
    this._configuration.builder
      .setName(this.name.toLowerCase())
      .setDescription(this.description);
  }

  public canExecute() {
    return true;
  }

  public execute(...args: any[]) {
    return this._configuration.execute?.call(this, ...args);
  }
}
