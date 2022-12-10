import DiscordBot from "../discord/DiscordBot";
import DiscordEventRouter from "../discord/DiscordEventRouter";

import { Command } from "./Command";

export default abstract class CommandRouter {
  private _discordBot: DiscordBot;
  private _eventRouter: DiscordEventRouter;

  public get discordBot() {
    return this._discordBot;
  }
  public get eventRouter() {
    return this._eventRouter;
  }

  constructor(
    eventRouter: DiscordEventRouter,
    discordBot: DiscordBot,
    commands: Command[]
  ) {
    this._eventRouter = eventRouter;
    this._discordBot = discordBot;
    this.initialize(commands);
  }

  public abstract initialize(commands: any[]): void;
}
