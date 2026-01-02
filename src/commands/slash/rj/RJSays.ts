import _ from "underscore";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import { GuildEmoji, CommandInteraction } from "discord.js";

import SlashCommand from "../SlashCommand";

const RJStrings: { [id: string]: string } = {
  sad: `<rj4>`,
  hurts: `<rj4>`,
  "shake it off": `<partyrj><tsktsk>`,
  no: `<rj><tsktsk>`,
  disapproves: `<rj><tsktsk>`,
  "tsk tsk": `<rj><tsktsk>`,
  chancla: `<rj><lachancla>`,
  "oh no": `<ohno><rj>`,
  "double oh no": `<ohno><rj><ohnoreverse>`,
  harold: `<rj3>`,
  "is watching": `<rj3>`,
  watching: `<rj3>`,
  suit: `<rj>\n👔`,
  party: `<partyrj>`,
  dance: `<partyrj>`,
  "finger guns": `<rj><fingerguns>`,
  ayy: `<rj><fingerguns>`,
  zoop: `<rj><fingerguns>`,
  hockey: `<rj>\n<krakenjersey>`,
  kraken: `<rj>\n<krakenjersey>`,
};

function textToEmojis(text: string, interaction: CommandInteraction) {
  const emojiPattern = /(?<=<).*?(?=>)/g;
  let emojis = text.matchAll(emojiPattern);

  for (const emoji of emojis) {
    // In Discord.js v15, access emojis through guild
    let discordEmoji = interaction.guild?.emojis.cache.find(
      (x: GuildEmoji) => x.name === emoji[0],
    );
    if (discordEmoji) {
      text = text.replace(
        `<${emoji[0]}>`,
        `<:${discordEmoji.name}:${discordEmoji.id}>`,
      );
    } else {
      throw new Error(`Unhandled emoji in string: "${emoji}" in "${text}`);
    }
  }

  return text;
}

export default new SlashCommand({
  name: "rj",
  help: "rj list",
  description: "makes funny little RJ emotes",
  builder: () =>
    new ChatInputCommandBuilder()
      .setName("rj")
      .setDescription("makes funny little RJ emotes")
      .addStringOptions([
        (option) => {
          option.setName("emote").setDescription("which emote would you like");
          const sortedChoices = Object.keys(RJStrings).sort();
          option.addChoices(
            ...sortedChoices.map((choice) => {
              return { name: choice, value: RJStrings[choice] };
            }),
          );
          return option;
        },
      ]),
  execute: (interaction) => {
    const emote = interaction.options.getString("emote");
    if (!emote) {
      const options = _.unique(Object.values(RJStrings));
      const val = _.random(options.length - 1);
      interaction.reply(textToEmojis(options[val], interaction));
      return;
    } else {
      interaction.reply(
        emote
          ? textToEmojis(emote, interaction)
          : "RJ does not know that command",
      );
    }
  },
});
