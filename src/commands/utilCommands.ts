import { Client, MessageEmbed } from "discord.js";
import { Command } from "../models/Command";
import { ServerInfo, Strings, AppConfiguration } from "../utils/constants";

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

export const botInfoCommand: Command = {
    description: 'show seabot info',
    help: 'status',
    name: 'status',
    execute: (message) => {
        const process_uptime = Math.floor(process.uptime());
        const { client } = message;
        const { uptime } = client;
        const { versions, arch } = process;
        message.channel.send(new MessageEmbed({
            title: 'SEABot Status',
            description: 'Latest release and uptime info',
            fields: [
                {
                    name: 'Version info',
                    value: `Node: ${versions.node}, V8: ${versions.v8}, OpenSSL: ${versions.openssl}`,
                    inline: false
                },
                {
                    name: 'Release number',
                    value: `${AppConfiguration.BOT_RELEASE_VERSION}`,
                    inline: true
                },
                {
                    name: 'Release Description',
                    value: `${AppConfiguration.BOT_RELEASE_DESCRIPTION}`,
                    inline: true
                },
                {
                    name: 'Release Commit',
                    value: `${AppConfiguration.BOT_RELEASE_COMMIT}`,
                    inline: true
                },
                {
                    name: 'Architecture',
                    value: `${arch}`,
                    inline: true
                },
                {
                    name: 'Release Method',
                    value: `${AppConfiguration.BOT_RELEASE_REASON}`,
                    inline: true
                },
                {
                    name: 'Process Uptime',
                    value: `${(process_uptime / 60 / 60).toFixed(2)} hours`,
                    inline: true
                },
                {
                    name: 'Client Uptime',
                    value: `${(uptime! / 60 / 60).toFixed(2)} hours`,
                    inline: true
                },
            ]
        }));
    }
}