import { ChatInputCommandBuilder } from "@discordjs/builders";
import { GuildEmoji } from "discord.js";

import SlashCommand from "../SlashCommand";

import { toSarcasticCase } from "../../../utils/helpers";

export default new SlashCommand({
  name: "sarcasm",
  description: "Make text sArCaStIc",
  builder: new ChatInputCommandBuilder().addStringOptions([
    (option) =>
      option
        .setRequired(true)
        .setName("text")
        .setDescription(toSarcasticCase("The text to sarcasticize")),
  ]),
  execute: (interaction) => {
    const string = interaction.options.getString("text") ?? null;
    const emoji = interaction.guild?.emojis.cache.find(
      (x: GuildEmoji) => x.name === "stupidsponge",
    );
    const spongeText = emoji?.toString() ?? "";
    string &&
      interaction.reply(
        `${spongeText} ${toSarcasticCase(string)} ${spongeText}`,
      );
  },
});
