import _ from "underscore";
import { Message } from "discord.js";
import { Command } from "../models/Command";
import { Emoji } from "../utils/constants";
import { SlashCommandBuilder } from "@discordjs/builders";

const RJStrings: {[id: string]: string} = {
    'sad': `${Emoji.RJ.rj4}`,
    'hurts': `${Emoji.RJ.rj4}`,
    'shake it off': `${Emoji.RJ.partyrj}${Emoji.tsktsk}`,
    'no': `${Emoji.RJ.rj}${Emoji.tsktsk}`,
    'disapproves': `${Emoji.RJ.rj}${Emoji.tsktsk}`,
    'tsk tsk': `${Emoji.RJ.rj}${Emoji.tsktsk}`,
    'chancla': `${Emoji.RJ.rj}${Emoji.lachancla}`,
    'oh no': `${Emoji.ohno}${Emoji.RJ.rj}`,
    'double oh no': `${Emoji.ohno}${Emoji.RJ.rj}${Emoji.ohnoreverse}`,
    'harold': `${Emoji.RJ.rj3}`,
    'is watching': `${Emoji.RJ.rj3}`,
    'watching': `${Emoji.RJ.rj3}`,
    'suit': `${Emoji.RJ.rj}\n👔`,
    'party': `${Emoji.RJ.partyrj}`,
    'dance': `${Emoji.RJ.partyrj}`,
    'finger guns': `${Emoji.RJ.rj}${Emoji.fingerguns}`,
    'ayy': `${Emoji.RJ.rj}${Emoji.fingerguns}`,
    'zoop': `${Emoji.RJ.rj}${Emoji.fingerguns}`,
    'hockey': `${Emoji.RJ.rj}\n${Emoji.krakenjersey}`,
    'kraken': `${Emoji.RJ.rj}\n${Emoji.krakenjersey}`
}

export const RJSays: Command = {
    name: "rj",
    help: "rj list",
    description: "makes funny little RJ emotes",
    async execute(message: Message, args?: string[]) {
        if (!args?.[0]) {
            const options = _.unique(Object.values(RJStrings));
            const val = _.random(options.length - 1);
            message.channel.send(options[val]);
            return;
        }
        // dynamically adds `list` command
        RJStrings["list"] = `RJ knows: ${Object.keys(RJStrings).join(", ")}`;

        const input = args?.join(" ").toLowerCase() || "";
        message.channel.send(RJStrings?.[input] ?? "RJ does not know that command");
  },
  slashCommandDescription: () => {
      return new SlashCommandBuilder()
        .setName('rj')
        .setDescription('makes funny little RJ emotes')
        .addStringOption(option => {
            option.setName('emote')
            .setDescription('which emote would you like');
            Object.keys(RJStrings).forEach(emoji => {
                option.addChoice(emoji, emoji);
            });
            return option;
        }
            
        );
  },
  executeSlashCommand: (interaction) => {
      const emote = interaction.options.getString('emote');
      if(!emote) {
        const options = _.unique(Object.values(RJStrings));
        const val = _.random(options.length - 1);
        interaction.reply(options[val]);
        return;
      }
      else{
        interaction.reply(RJStrings?.[emote.toLowerCase()] ?? "RJ does not know that command");
      }
  }
};