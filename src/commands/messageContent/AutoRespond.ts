import { GuildEmoji, Message } from "discord.js";
import { REGEX, Strings } from "../../utils/constants";
import { replaceMentions } from "../../utils/helpers";
import ContentCommand from "./ContentCommand";

type AutoResponse = {
  message?: (() => string) | string;
  reaction?: ((message: Message) => GuildEmoji | null) | string;
  trim?: boolean;
  enableLinks?: boolean;
  chance?: number;
};

const responseMap = new Map<string | RegExp, AutoResponse>([
  [/hodor/i, { reaction: "🚪" }],
  [/bisbopt/i, { reaction: (message) => emojiFromName("bisbopt", message) }],
  [/duck/i, { reaction: "🦆" }],
  [
    /69/i,
    { reaction: (message) => emojiFromName("nice", message), trim: true },
  ],
  [
    /420/i,
    { reaction: (message) => emojiFromName("weed", message), trim: true },
  ],
  [
    /puya[1ilӏ]{1,2}up/i,
    { reaction: (message) => emojiFromName("downvote", message) },
  ],
  [
    /[Ss]pokane/i,
    { reaction: (message) => emojiFromName("downvote", message) },
  ],
  [/bruh/i, { reaction: (message) => emojiFromName("bruh", message) }],
  [/^SEA$/im, { message: "HAWKS!" }],
  [/(tbf|to be fair)/i, { message: Strings.letterkennyGif, chance: 0.33 }],
  [/(\s|^)eggs?/i, { reaction: "🥚", chance: 0.2 }],
  [/pike[']?s[']? place/i, { message: "uh, pike* place tyvm", chance: 1 }],
]);

function emojiFromName(emojiName: string, message: Message): GuildEmoji | null {
  const emoji = message.guild?.emojis.cache.find(
    (x: GuildEmoji) => x.name === emojiName,
  );
  return emoji || null;
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
  "i",
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
            ? response.message()
            : response.message;
        message.reply(reply);
      }

      if (response.reaction) {
        try {
          const emoji =
            typeof response.reaction === "function"
              ? response.reaction(message)?.toString()
              : response.reaction;
          if (emoji) {
            message.react(emoji);
          }
        } catch (error) {
          console.error(`Failed to react with emoji: ${error}`);
        }
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
