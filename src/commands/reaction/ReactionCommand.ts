import { MessageReaction, Message, User } from "discord.js";

import { Command, CommandConfiguration } from "../Command";

export interface ReactionCommandConfiguration extends CommandConfiguration {
  removeReaction?: boolean;
  emojiName?: string;
  execute: (
    reaction: MessageReaction,
    message?: Message,
    user?: User
  ) => any | Promise<any>;
}

export default class ReactionCommand extends Command {
  private _configuration: ReactionCommandConfiguration;

  constructor(configuration: ReactionCommandConfiguration) {
    super(configuration);
    this._configuration = configuration;
  }

  public get emojiName() {
    return this._configuration.emojiName;
  }

  public get removeReaction() {
    return this._configuration.removeReaction;
  }

  public canExecute() {
    return true;
  }

  public execute(...args: any[]): any {
    const reaction = args?.[0];
    const message = args?.[1];
    const user = args?.[2];
    this._configuration.execute(reaction, message, user);
  }
}
