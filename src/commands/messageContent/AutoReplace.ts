import { Message } from "discord.js";

import ContentCommand from "./ContentCommand";

type AutoReplaceCategory = {
  name: string;
  reason: string;
  replacements: RegExp[];
  combinedReplacement?: RegExp;
}

const autoReplaceStrings: AutoReplaceCategory[] = [
  {
    name: "twitter",
    reason: "replacing links so we don't send traffic to the bad site:",
    replacements: [
      /twitter\.com/i,
      /x\.com/i,
      /girlcockx\.com/i,
      /fixupx\.com/i,
      /vxtwitter\.com/i,
      /fxtwitter\.com/i,
    ]
  }
];

const mappedAutoReplaceStrings = autoReplaceStrings.map((category) => {
  const newCategory = category
  newCategory.combinedReplacement = new RegExp(
    category.replacements.map((regex) => regex.source).join("|"),
    "ig"
  );
  return newCategory;
});

const trigger = new RegExp(
  [...mappedAutoReplaceStrings.map((category) => category.combinedReplacement?.source)]
    .join("|"),
  "i"
);

export default new ContentCommand({
  name: "autoreact",
  description:
    "Automatically reacts to messages when a certain string or regex is triggered.",
  trigger,
  handler: (message: Message) => {
    const content = message.content;
    for (const category of mappedAutoReplaceStrings) {
      if (category.combinedReplacement && category.combinedReplacement.test(content)) {
        console.log(`${category.reason} ${category.name}`);
        if (message.channel.isSendable()) {
          message.channel.send(`Modifying <@${message.author.id}>'s message by ${category.reason}\n> ${message.content.replace(category.combinedReplacement, "xcancel.com").replace(/\n/g, "\n> ")}`);
        }
        message.delete();
        return;
      }
    }
  }
});
