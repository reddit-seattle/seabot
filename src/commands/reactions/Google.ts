import { Message, PartialMessage } from "discord.js";
import { EmojiIDs } from "../../utils/constants";
import { replaceMentions } from "../../utils/helpers";
import ReactionCommand from "./ReactionCommand";

export default new ReactionCommand(EmojiIDs.GOOGLE, false, {
    name: "google",
    description: `react to a post to google its contents`,
    help: `react to a post to google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if (!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply({
            content: `https://www.google.com/search?q=${encodeURIComponent(resultantContent)}`,
            allowedMentions: {
                repliedUser: false,
            },
        });
    },
});
