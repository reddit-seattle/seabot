import { GuildEmoji, Message } from "discord.js";

import ContentCommand from "./ContentCommand";

import { discordBot } from "../../server";
import { replaceMentions } from "../../utils/helpers";
import { REGEX, Strings } from "../../utils/constants";

type AutoResponse = {
  message?: (() => string) | string;
  reaction?: (() => GuildEmoji) | string;
  trim?: boolean;
  enableLinks?: boolean;
  chance?: number;
};

const responseMap = new Map<string | RegExp, AutoResponse>([
  [/hodor/i, { reaction: "🚪" }],
  [/bisbopt/i, { reaction: () => emojiFromName("bisbopt") }],
  [/duck/i, { reaction: "🦆" }],
  [/69/i, { reaction: () => emojiFromName("nice"), trim: true }],
  [/420/i, { reaction: () => emojiFromName("weed"), trim: true }],
  [/puya[1ilӏ]{1,2}up/i, { reaction: () => emojiFromName("downvote") }],
  [/bruh/i, { reaction: () => emojiFromName("bruh") }],
  [/^SEA$/im, { message: "HAWKS!" }],
  [/(tbf|to be fair)/i, { message: Strings.letterkennyGif, chance: 0.75 }],
]);

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
  [...responseMap.keys()]
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
  description:
    "Automatically reacts to messages when a certain string or regex is triggered.",
  trigger,
  handler: (message: Message) => {
    for (const [trigger, response] of responseMap) {
      if (!shouldRespond(trigger, response)) continue;
      const responseRoll = Math.random();
      if (response.chance && response.chance < responseRoll) continue;

      if (response.message) {
        const reply =
          typeof response.message === "function"
            ? (response.message as Function).call(response)
            : response.message;
        message.reply(reply);
      }

      if (response.reaction) {
        const emoji =
          typeof response.reaction === "function"
            ? (response.reaction as Function).call(response).toString()
            : response.reaction;
        message.react(emoji);
      }
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
