import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, CommandInteraction, MessageEmbed } from "discord.js";
import { format } from "path";
import DBConnector from "../db/DBConnector";
import { Command } from "../models/Command";
import { Award } from "../models/DBModels";
import { Database } from "../utils/constants";

export class GiveAwardCommand implements Command {
    private connector: DBConnector<Award>;
    name: string = 'award';
    adminOnly = false;
    constructor(connector: DBConnector<Award>) {
        this.connector = connector;
    }
    description = 'Give another user an award';
    help = 'award user message';
    execute = (message: Message<boolean>, args?: string[] | undefined) => {
        return;
    }
    slashCommandDescription = () => {
        return new SlashCommandBuilder()
            .setName('award')
            .setDescription('give another user an award')
            .addUserOption(option => {
                return option
                    .setName('user')
                    .setDescription('who are you awarding')
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName('message')
                    .setDescription('let them know what they did to deserve it!')
                    .setRequired(false);
            })

    };
    executeSlashCommand = async (interaction: CommandInteraction) => {
        await interaction.deferReply({ephemeral: true});
        const user = interaction.options.getUser('user', true);
        if(user.id == interaction.user.id) {
            await interaction.followUp({ content: 'Try giving someone else an award, maybe?', ephemeral: true});
            return;
        }
        const message = interaction.options.getString('message', false);
        const award: Award = {
            awardedBy: interaction.user.id,
            awardedTo: user.id,
            awardedOn: new Date,
            message: message ?? undefined
        }
        const result = await this.connector.addItem(award);
        if(result?.id) {
            await interaction.followUp({content: 'Award granted!', ephemeral: true});
        }
        // interaction.guild?.systemChannel?.send(`${user.username} has been given an award!`)
    }
}

export class ShowAwardsCommand implements Command {
    private connector: DBConnector<Award>;
    name: string = 'awards';
    adminOnly = false;
    constructor(connector: DBConnector<Award>) {
        this.connector = connector;
    }
    description = 'Show awards (for yourself or another user)';
    help = 'awards [user]';
    execute = (message: Message<boolean>, args?: string[] | undefined) => {
        return;
    }
    slashCommandDescription = () => {
        return new SlashCommandBuilder()
            .setName('awards')
            .setDescription('show your awards (or another user\'s)')
            .addUserOption(option => {
                return option
                    .setName('user')
                    .setDescription('who are you awarding')
                    .setRequired(false);
            })

    };
    executeSlashCommand = async (interaction: CommandInteraction) => {
        await interaction.deferReply({ephemeral: true});
        const user = interaction.options.getUser('user', false);
        const records = await this.connector.find(Database.Queries.AWARDS_BY_USER(user ? user.id : interaction.user.id));
        if(records?.[0]) {
            const embed = new MessageEmbed({
                title: `Awards for ${user?.username || interaction.user.username}`,
                description: `${records.length} award${records.length > 1 ? 's' : ''}:`,
                fields: records.map((award, i) => {
                    return {
                        name: `${i+1}: ${award.message || 'No message'}`,
                        value: award.awardedOn.toString()
                    }
                })
            });
            await interaction.followUp({embeds: [embed]});
        }
        else{
            await interaction.followUp({content: 'No awards found', ephemeral: true})
        }
        
    }
}

