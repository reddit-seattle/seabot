import { Message, PartialMessage } from "discord.js";
import { ReactionCommand } from "../models/Command";
import { EmojiIDs } from "../utils/constants";
import { replaceMentions } from "../utils/helpers";


export const googleReact: ReactionCommand = {
    removeReaction: false,
    emojiId: EmojiIDs.GOOGLE,
    name: 'google',
    description: `react to a post to google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if(!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply({
            content: `https://www.google.com/search?q=${encodeURIComponent(resultantContent)}`,
            allowedMentions: {
                repliedUser: false
            }
        });
    }
}

export const lmgtfyReact: ReactionCommand = {
    removeReaction: false,
    emojiId: EmojiIDs.LMGTFY,
    name: 'lmgtfy',
    description: `react to a post to help someone google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if(!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply(`https://lmgtfy.app/?q=${encodeURIComponent(resultantContent)}`);
    }
}
