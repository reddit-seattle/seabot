import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { toSarcasticCase } from "../../../utils/helpers";
import { discordBot } from "../../../server";

export default new SlashCommand({
    name: "sarcasm",
    description: "Make text sArCaStIc",
    builder: new SlashCommandBuilder()
        .addStringOption((option) => {
            return option.setRequired(true).setName("text").setDescription(toSarcasticCase("The text to sarcasticize"));
        }),
    execute: (interaction) => {
        const string = interaction.options.getString("text") ?? null;
        const spongeEmoji = discordBot.client.emojis.cache.find((x) => x.name === "stupidsponge");
        let spongeText: string;
        if (!spongeEmoji) {
            spongeText = "";
        } else {
            spongeText = `<${spongeEmoji.name}:${spongeEmoji.id}>`;
        }
        string && interaction.reply(`${spongeText} ${toSarcasticCase(string)} ${spongeText}`);
    },
});
