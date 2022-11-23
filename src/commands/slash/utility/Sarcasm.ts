import { SlashCommandBuilder } from "discord.js";
import { Command } from "../../Command";
import { toSarcasticCase } from "../../../utils/helpers";
import { discordBot } from "../../../server";

export default new Command({
    name: 'sarcasm',
    help: 'sarcasm text',
    description: 'make text sArCaStIc',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('sarcasm')
            .setDescription('make text sArCaStIc')
            .addStringOption(option => {
                return option.setName('text')
                .setDescription('text to sArCaStIcIzE')
                .setRequired(true)
            })
    },
    executeSlashCommand: (interaction) => {
        const string = interaction.options.getString('text') ?? null;
        const spongeEmoji = discordBot.client.emojis.cache.find(x => x.name === "stupidsponge");
        let spongeText:string;
        if (!spongeEmoji) {
            spongeText = "";
        } else {
            spongeText = `<${spongeEmoji.name}:${spongeEmoji.id}>`;
        }
        string && interaction.reply(`${spongeText} ${toSarcasticCase(string)} ${spongeText}`);
    }
});