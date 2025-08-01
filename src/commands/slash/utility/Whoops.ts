import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "whoops",
  description: "whoops",
  help: "whoops my butt :butt: -> whoops my butt fell out :butt:",
  builder: new ChatInputCommandBuilder()
    .addStringOptions([
      (option) => 
        option
          .setName("object")
          .setDescription("what fell out (include `my`, `the`, etc)")
          .setRequired(true),
      (option) => 
        option
          .setName("emote")
          .setDescription("what does it look like (emote / ascii)")
          .setRequired(true),
      (option) => 
        option
          .setName("bottomtext")
          .setDescription("optional, replaces `fell off`")
          .setRequired(false)
    ]),
  execute: (interaction) => {
    const emoji = interaction.options.getString("emote", true);
    const object = interaction.options.getString("object", true);
    const bottomText = interaction.options.getString("bottomtext", false);
    interaction.reply(Strings.whoops(object, emoji, bottomText || undefined));
  },
});
