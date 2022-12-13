import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { discordBot } from "../../../server";
import { toSarcasticCase } from "../../../utils/helpers";

export default new SlashCommand({
  name: "sarcasm",
  description: "Make text sArCaStIc",
  builder: new SlashCommandBuilder().addStringOption((option) => {
    return option
      .setRequired(true)
      .setName("text")
      .setDescription(toSarcasticCase("The text to sarcasticize"));
  }),
  execute: (interaction) => {
    const string = interaction.options.getString("text") ?? null;
    const emoji = discordBot.client.emojis.cache.find(
      (x) => x.name === "stupidsponge"
    );
    const spongeText = emoji?.toString() ?? "";
    string &&
      interaction.reply(
        `${spongeText} ${toSarcasticCase(string)} ${spongeText}`
      );
  },
});
