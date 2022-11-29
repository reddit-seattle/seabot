import _ from "underscore";
import { Command } from "../../Command";
import { SlashCommandBuilder } from "@discordjs/builders";
import { discordBot } from "../../../server";

const RJStrings: {[id: string]: string} = {
    'sad': `<rj4>`,
    'hurts': `<rj4>`,
    'shake it off': `<partyrj><tsktsk>`,
    'no': `<rj><tsktsk>`,
    'disapproves': `<rj><tsktsk>`,
    'tsk tsk': `<rj><tsktsk>`,
    'chancla': `<rj><lachancla>`,
    'oh no': `<ohno><rj>`,
    'double oh no': `<ohno><rj><ohnoreverse>`,
    'harold': `<rj3>`,
    'is watching': `<rj3>`,
    'watching': `<rj3>`,
    'suit': `<rj>\n👔`,
    'party': `<partyrj>`,
    'dance': `<partyrj>`,
    'finger guns': `<rj><fingerguns>`,
    'ayy': `<rj><fingerguns>`,
    'zoop': `<rj><fingerguns>`,
    'hockey': `<rj>\n<krakenjersey>`,
    'kraken': `<rj>\n<krakenjersey>`
}

function textToEmojis(text: string) {
    const emojiPattern = /(?<=<).*?(?=>)/g;
    let emojis = text.matchAll(emojiPattern);

    for (const emoji of emojis) {
        let discordEmoji = discordBot.client.emojis.cache.find(x => x.name === emoji[0]);
        if (discordEmoji) {
            text = text.replace(`<${emoji[0]}>`, `<:${discordEmoji.name}:${discordEmoji.id}>`);
        } else {
            throw new Error(`Unhandled emoji in string: "${emoji}" in "${text}`);
        }
    }

    return text;
}

export default new Command({
    name: "rj",
    help: "rj list",
    description: "makes funny little RJ emotes",
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('rj')
            .setDescription('makes funny little RJ emotes')
            .addStringOption(option => {
                option.setName('emote')
                .setDescription('which emote would you like');
                Object.keys(RJStrings).forEach(emoji => {
                    option.addChoices({name: emoji, value: textToEmojis(RJStrings[emoji])});
                });
                return option;
            });
    },
    executeSlashCommand: (interaction) => {
        const emote = interaction.options.getString('emote');
        if(!emote) {
            const options = _.unique(Object.values(RJStrings));
            const val = _.random(options.length - 1);
            interaction.reply(textToEmojis(options[val]));
            return;
        }
        else{
            interaction.reply(RJStrings?.[emote.toLowerCase()] ?? "RJ does not know that command");
        }
    }
});