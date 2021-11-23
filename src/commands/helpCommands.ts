import { Message, MessageEmbed } from "discord.js";
import { Command } from '../models/Command';
import { Config, RoleIds, Strings } from '../utils/constants';
import { botInfoCommand, coffeeCommand, pingCommand, teaCommand, valheimServerCommand } from "../commands/utilCommands";
import { AirQualityCommand, ForecastCommand, WeatherCommand } from '../commands/weatherCommands';
import { MTGCommand } from '../commands/mtgCommands';
import { HueEnable, HueInit, HueSet } from "./hueCommands";
import { RJSays } from "./rjCommands";

// TODO: common command loader
const commands: Command[] = [
    coffeeCommand,
    pingCommand,
    teaCommand,
    valheimServerCommand,
    ForecastCommand,
    WeatherCommand,
    MTGCommand,
    AirQualityCommand,
    botInfoCommand,
    HueSet,
    HueInit,
    HueEnable,
    RJSays
];

export const Help: Command = {
    name: 'help',
    help: 'help',
    description: 'Display SeaBot help',
    async execute(message: Message, args?: string[]) {

        // filter admin commands to only mods
        const filteredCommands = commands.filter(command =>
            !command?.adminOnly ||
            (command?.adminOnly && message.member?.roles.cache.has(RoleIds.MOD))
        );

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