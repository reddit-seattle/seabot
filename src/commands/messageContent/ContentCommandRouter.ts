import { Events, Message } from "discord.js";

import CommandRouter from "../CommandRouter";
import ContentCommand from "./ContentCommand";

export default class ContentCommandRouter extends CommandRouter {
  public initialize(commands: ContentCommand[]): void {
    this.eventRouter.addEventListener(
      Events.MessageCreate,
      async (message: Message) => {
        if (message.author.bot) return;
        if (message.partial) message = await message.fetch();

        for (const command of commands) {
          try {
            if (command.canExecute(message)) {
              command.execute(message);
            }
          } catch (error) {
            console.error(`Error while handling command ${command.name}`);
            console.error(error);
          }
        }
      }
    );
  }
}
