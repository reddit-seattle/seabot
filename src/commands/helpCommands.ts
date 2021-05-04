import { Message, MessageEmbed } from "discord.js";
import { Command } from '../models/Command';
import { Config } from '../utils/constants';
import { coffeeCommand, pingCommand, teaCommand, valheimServerCommand } from "../commands/utilCommands";
import { ForecastCommand, WeatherCommand } from '../commands/weatherCommands';
import { MTGCommand } from '../commands/mtgCommands';

// TODO: common command loader
const commands: Command[] = [
    coffeeCommand,
    pingCommand,
    teaCommand,
    valheimServerCommand,
    ForecastCommand,
    WeatherCommand,
    MTGCommand
];

export const Help: Command = {
    name: 'help',
    help: 'help',
    description: 'Display SeaBot help',
    async execute(message: Message, args?: string[]) {
        const embed = new MessageEmbed({
            title: `SeaBot Help`,
            description: 'Commands',
            color: 111111,
            fields: [
                ...commands.map(command => {
                    return {
                        name: command.name,
                        value: `${command.description}\nExample: ${Config.prefix}${command.help}`,
                        inline: false
                    }
                }),
                {
                    name: 'See an issue? Want to request a feature?',
                    inline: false,
                    value: 'https://github.com/reddit-seattle/seabot/issues'
                },
            ]
        });
        message.channel.send(embed);
    },
}