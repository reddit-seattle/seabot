import { Message, PartialMessage } from "discord.js";
import { EmojiIDs } from "../../utils/constants";
import { replaceMentions } from "../../utils/helpers";
import ReactionCommand from "./ReactionCommand";

export default new ReactionCommand(EmojiIDs.LMGTFY, false, {
    name: "lmgtfy",
    description: `react to a post to help someone google its contents`,
    help: `react to a post to help someone google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if (!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply(`https://lmgtfy.app/?q=${encodeURIComponent(resultantContent)}`);
    },
});
