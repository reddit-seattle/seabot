import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { Command } from "../../Command";
import { AppConfiguration } from "../../../utils/constants";

export default new Command({
    description: 'show seabot info',
    help: 'status',
    name: 'status',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('status')
            .setDescription('show useless seabot info')
    },
    executeSlashCommand: (interaction) => {
        const process_uptime = Math.floor(process.uptime());
        const { client } = interaction;
        const { uptime } = client;
        const { versions, arch } = process;
        interaction.reply({
            embeds: [
                new EmbedBuilder({
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
                })
            ]
        });
    },
    
});