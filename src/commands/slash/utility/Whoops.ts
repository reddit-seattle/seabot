import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "whoops",
  description: "whoops",
  help: "whoops my butt :butt: -> whoops my butt fell out :butt:",
  builder: new SlashCommandBuilder()
    .addStringOption((option) => {
      return option
        .setName("object")
        .setDescription("what fell out (include `my`, `the`, etc)")
        .setRequired(true);
    })
    .addStringOption((option) => {
      return option
        .setName("emote")
        .setDescription("what does it look like (emote / ascii)")
        .setRequired(true);
    })
    .addStringOption((option) => {
      return option
        .setName("bottomtext")
        .setDescription("optional, replaces `fell off`")
        .setRequired(false);
    }),
  execute: (interaction) => {
    const emoji = interaction.options.getString("emote", true);
    const object = interaction.options.getString("object", true);
    const bottomText = interaction.options.getString("bottomtext", false);
    interaction.reply(Strings.whoops(object, emoji, bottomText || undefined));
  },
});
