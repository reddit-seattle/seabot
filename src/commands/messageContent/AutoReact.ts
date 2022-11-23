import { Message } from "discord.js";

import { replaceMentions } from "../../utils/helpers";
import { discordBot } from "../../server";

const reactionMap = new Map<string | RegExp, string>([
    [/hodor/i, "door"],
    [/bisbopt/i, "bisbopt"],
    [/duck/i, "duck"],
    [/69/i, "nice"],
    [/420/i, "weed"],
    [/puya[1ilӏ]{1,2}up/i, "downvote"],
    [/bruh/i, "bruh"]
]);

export default {
    trigger: /(hodor|bisbopt|duck|69|420|puya[1ilӏ]{1,2}up|bruh)/i,
    handler: (message: Message) => {
        message.content = replaceMentions(message);
        for (const [ trigger, reaction ] of reactionMap) {
            if ((trigger instanceof RegExp)) {
                if (!trigger.test(message.content)) {
                    continue;
                }
            } else {
                if (!message.content.toLowerCase().includes(trigger)) {
                    continue;
                }
            }

            const emoji = discordBot.client.emojis.cache.find(x => x.name === reaction);
            if (!emoji) {
                throw new Error(`Emoji for autoreact "${reaction}" cannot be found.`);
            }
            
            message.react(emoji);
        }
    }
}