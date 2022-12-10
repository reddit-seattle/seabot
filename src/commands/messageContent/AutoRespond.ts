import { EmojiIdentifierResolvable, GuildEmoji, Message, MessagePayload, MessageReplyOptions } from "discord.js";

import ContentCommand from "./ContentCommand";

import { discordBot } from "../../server";
import { replaceMentions } from "../../utils/helpers";
import { REGEX, Strings } from "../../utils/constants";

type AutoResponse = {
    message?: (() => string) | string;
    reaction?: () => EmojiIdentifierResolvable;
    trim?: boolean;
    enableLinks?: boolean;
    chance?: number;
};



type ResponseEntry =  [RegExp | string, AutoResponse]

const responseList = [
    [/hodor/i, { reaction: () => emojiFromName("door") }],
    [/bisbopt/i, { reaction: () => emojiFromName("bisbopt") }],
    [/duck/i, { reaction: () => emojiFromName("duck") }],
    [/69/i, { reaction: () => emojiFromName("nice"), trim: true }],
    [/420/i, { reaction: () => emojiFromName("weed"), trim: true }],
    [/puya[1ilӏ]{1,2}up/i, { reaction: () => emojiFromName("downvote") }],
    [/bruh/i, { reaction: () => emojiFromName("bruh") }],
    ["SEA", { message: "HAWKS!" }],
    [/(tbf|to be fair)/i, { message: Strings.letterkennyGif, chance: 0.75 }],
]  as ResponseEntry[];

function emojiFromName(emojiName: string): GuildEmoji {
  const emoji = discordBot.client.emojis.cache.find(
    (x) => x.name === emojiName
  );
  if (!emoji) {
    throw new Error(`Could not find emoji with name "${emojiName}"`);
  }

  return emoji;
}

const trigger = new RegExp(
    responseList
        .map(([key]) => {
            if (typeof key === "string") {
                return key;
            } else {
                return key.source;
            }
        })
        .join("|"),
    "i"
);

export default new ContentCommand({
    name: "autoreact",
    description: "Automatically reacts to messages when a certain string or regex is triggered.",
    trigger,
    handler: async (message: Message) => {
        for (const [trigger, response] of responseList) {
            if (!shouldRespond(trigger, response)) continue;
            const responseRoll = Math.random();
            if ('chance' in response && response.chance && response.chance < responseRoll) continue;

            if ('message' in response && response.message) {
                const reply =
                    typeof response.message === "function"
                        ? (response.message).call(response)
                        : response.message;
                await message.reply(reply);
            }

            if ('reaction' in response && response.reaction) {
                const emoji =
                    typeof response.reaction === "function"
                        ? response.reaction.call(response).toString()
                        : response.reaction;
                await message.react(emoji);
            }
            // One response per customer, please.
            break;
        }

    function shouldRespond(trigger: string | RegExp, reaction: AutoResponse) {
      let sanitizedMessage = replaceMentions(message);
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
