import { Message } from "discord.js";

import ContentCommand from "./ContentCommand";

import { discordBot } from "../../server";
import { replaceMentions } from "../../utils/helpers";
import { REGEX } from "../../utils/constants";

type AutoReaction = {
    emojiName: string;
    trim?: boolean;
    enableLinks?: boolean;
};

const reactionMap = new Map<string | RegExp, AutoReaction>([
    [/hodor/i, { emojiName: "door" }],
    [/bisbopt/i, { emojiName: "bisbopt" }],
    [/duck/i, { emojiName: "duck" }],
    [/69/i, { emojiName: "nice", trim: true }],
    [/420/i, { emojiName: "weed", trim: true }],
    [/puya[1ilӏ]{1,2}up/i, { emojiName: "downvote" }],
    [/bruh/i, { emojiName: "bruh" }],
]);

const trigger = new RegExp(
    [...reactionMap.keys()]
        .map((key) => {
            if (typeof key === "string") {
                return key;
            } else {
                return (key as RegExp).source;
            }
        })
        .join("|"),
    "i"
);

export default new ContentCommand({
    name: "autoreact",
    description: "Automatically reacts to messages when a certain string or regex is triggered.",
    trigger,
    handler: (message: Message) => {
        for (const [trigger, reaction] of reactionMap) {
            if (!shouldReactToMessage(trigger, reaction)) continue;

            const emoji = discordBot.client.emojis.cache.find((x) => x.name === reaction.emojiName);
            if (!emoji) {
                throw new Error(`Emoji for autoreact "${reaction.emojiName}" cannot be found.`);
            }

            message.react(emoji);
            // One reaction per customer, please.
            break;
        }

        function shouldReactToMessage(trigger: string | RegExp, reaction: AutoReaction) {
            let sanitizedMessage = replaceMentions(message).toLowerCase();
            if (!reaction.enableLinks) {
                sanitizedMessage = sanitizedMessage.replace(REGEX.URL, "");
            }

            if (reaction.trim) {
                sanitizedMessage = sanitizedMessage.replace(/s+/g, "");
            }

            if (trigger instanceof RegExp) {
                return trigger.test(sanitizedMessage);
            } else {
                return sanitizedMessage.includes(trigger);
            }
        }
    },
});
