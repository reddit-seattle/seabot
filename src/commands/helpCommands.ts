import { Message, MessageEmbed } from "discord.js";
import { Command, ReactionCommand } from '../models/Command';
import { Config, RoleIds, Strings } from '../utils/constants';
import { botInfoCommand, coffeeCommand, pingCommand, sarcasmText, teaCommand, valheimServerCommand } from "../commands/utilCommands";
import { AirQualityCommand, ForecastCommand, WeatherCommand } from '../commands/weatherCommands';
// import { MTGCommand } from '../commands/mtgCommands';
import { HueEnable, HueInit, HueSet } from "./hueCommands";
import { RJSays } from "./rjCommands";
import { googleReact, lmgtfyReact } from "./reactionCommands";

// TODO: common command loader
const commands: Command[] = [
    coffeeCommand,
    pingCommand,
    teaCommand,
    valheimServerCommand,
    ForecastCommand,
    WeatherCommand,
    // MTGCommand,
    AirQualityCommand,
    botInfoCommand,
    HueSet,
    HueInit,
    HueEnable,
    RJSays,
    sarcasmText
];

const reactions: ReactionCommand[] = [
    lmgtfyReact,
    googleReact
];

export const Help: Command = {
    name: 'help',
    help: 'help',
    description: 'Display SeaBot command help',
    async execute(message: Message, args?: string[]) {

        // filter admin commands to only mods
        let filteredCommands = commands.filter(command =>
            !command?.adminOnly ||
            (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );

        // try only showing help for a single command if the user specifies one that matches
        const argCommand = filteredCommands.find(command => command.name.toLowerCase() == args?.[0]?.toLowerCase());
        if(argCommand) {
            filteredCommands = [argCommand];
        }

        const embed = new MessageEmbed({
            title: `SeaBot Help`,
            description: 'Commands',
            color: 111111,
            fields: [
                ...filteredCommands.map(command => {
                    return {
                        name: command.name,
                        value: `${command.description}\nExample: ${Config.prefix}${command.help}`,
                        inline: false
                    }
                }),
                {
                    name: Strings.feedbackText,
                    inline: false,
                    value: Strings.newIssueURL
                },
            ]
        });
        message.channel.send({embeds: [embed]});
    },
}

export const ReactionHelp: Command = {
    name: 'reactions',
    help: 'reactions',
    description: 'Display reaction command help',
    async execute(message: Message, args?: string[]) {

        // filter admin commands to only mods
        let filteredCommands = reactions.filter(command =>
            !command?.adminOnly ||
            (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );


        const embed = new MessageEmbed({
            title: `SeaBot Reaction Command Help`,
            description: 'Reactions',
            color: 111111,
            fields: [
                ...filteredCommands.map(command => {
                    return {
                        name: command.name,
                        value: `<:${command.name}:${command.emojiId}>: ${command.description}`,
                        inline: false
                    }
                }),
                {
                    name: Strings.feedbackText,
                    inline: false,
                    value: Strings.newIssueURL
                },
            ]
        });
        message.channel.send({embeds: [embed]});
    },
}