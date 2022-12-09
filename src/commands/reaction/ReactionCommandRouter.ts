import { Events, MessageReaction } from "discord.js";

import CommandRouter from "../CommandRouter";
import ReactionCommand from "./ReactionCommand";

export default class ReactionCommandRouter extends CommandRouter {
    public initialize(commands: ReactionCommand[]): void | Promise<void> {
        const commandMap = new Map<string, ReactionCommand>();
        commands.forEach((command) => {
            commandMap.set(command.emojiName ? command.emojiName : command.name, command);
        });

        this.eventRouter.addEventListener(Events.MessageReactionAdd, async (reaction: MessageReaction) => {
            const { message, emoji } = reaction;
            const alreadyReacted = (reaction.count && reaction.count > 1) == true;

            // this prevents the same reaction command from firing multiple times
            if (message.author?.bot || !emoji.id || alreadyReacted) {
                return;
            }

            try {
                if (emoji.name && commandMap.has(emoji.name)) {
                    const command = commandMap.get(emoji.id) as ReactionCommand;
                    if (command.execute) {
                        command.execute(message);
                    }

                    if (command.removeReaction) {
                        await reaction.remove();
                    }
                }
            } catch (e: unknown) {
                console.dir(e);
                message.react("💩");
            }
        });
    }
}
