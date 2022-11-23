import { Message } from "discord.js";
import { any } from "underscore";

import { Emoji, REGEX } from "../../utils/constants";
import { replaceMentions } from "../../utils/helpers";

const reactionMap = new Map<string | RegExp, string>([
    [/hodor/i, "🚪"],
    [/bisbopt/i, Emoji.bisbopt],
    [/duck/i, "🦆"],
    [/69/i, Emoji.nice],
    [/420/i, Emoji.weed],
    [/puya[1ilӏ]{1,2}up/i, Emoji.downvote],
    [/bruh/i, Emoji.bruh]
]);

export default {
    trigger: /(hodor|bisbopt|duck|69|420|puya[1ilӏ]{1,2}up|bruh)/i,
    handler: (message: Message) => {
        message.content = replaceMentions(message);
        for (const [ trigger, reaction ] of reactionMap) {
            if ((trigger instanceof RegExp)) {
                if (trigger.test(message.content)) message.react(reaction);
            } else {
                if (message.content.toLowerCase().includes(trigger)) message.react(reaction);
            }
        }
    }
}