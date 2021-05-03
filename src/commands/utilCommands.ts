import { Command } from "../models/Command";
import { ServerInfo, Strings } from "../utils/constants";

export const pingCommand: Command = {
    name: 'ping',
    help: 'ping',
    description: 'ping',
    execute: (message) => message.channel.send('pong!')
}

export const teaCommand: Command = {
    name: 'tea',
    help: 'tea',
    description: 'ask for tea',
    execute: (message) => message.channel.send(Strings.teapot)
}

export const coffeeCommand: Command = {
    name: 'coffee',
    help: 'coffee',
    description: 'ask for coffee',
    execute: (message) => message.channel.send(Strings.coffee)
}

export const valheimServerCommand: Command = {
    description: 'show valheim server info',
    help: 'valheim',
    name: 'valheim',
    execute: (message) => message.channel.send(
        `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
    )
}