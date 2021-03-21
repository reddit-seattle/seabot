import { Command } from "../models/Command";
import { ServerInfo, Strings } from "../utils/constants";

export const pingCommand: Command = {
    name: 'ping',
    description: 'ping',
    execute: (message) => message.channel.send('pong!')
}

export const teaCommand: Command = {
    name: 'tea',
    description: 'tea',
    execute: (message) => message.channel.send(Strings.teapot)
}
export const coffeeCommand: Command = {
    name: 'coffee',
    description: 'coffee',
    execute: (message) => message.channel.send(Strings.coffee)
}

export const valheimServerCommand: Command = {
    description: 'valheim server info',
    name: 'valheim',
    execute: (message) => message.channel.send(
        `**Valheim Dedicated Server Information**:
        server: \`${ServerInfo.Valheim.serverName}\`
        ip: \`${ServerInfo.Valheim.ipAddress}\`
        password: \`${ServerInfo.Valheim.access}\`
        `
    )
}