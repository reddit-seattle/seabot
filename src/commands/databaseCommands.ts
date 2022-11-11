
import {
    SlashCommandBuilder,
    Message,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMemberRoleManager,
} from "discord.js";
import moment from "moment";
import DBConnector from "../db/DBConnector";
import { Command } from "../models/Command";
import { Award, Incident, Telemetry } from "../models/DBModels";
import { Database, RoleIds } from "../utils/constants";



enum AwardSubCommandType {
    GIVE = 'give',
    LIST = 'list'
}
export class AwardsCommand implements Command {
    private connector: DBConnector<Award>;
    name: string = 'award';
    adminOnly = true;
    constructor(connector: DBConnector<Award>) {
        this.connector = connector;
    }
    description = 'Give another user an award';
    help = 'award user message | award user list';
    execute = (message: Message<boolean>, args?: string[] | undefined) => {
        // will not implement, slash commands are cooler
        return;
    }
    slashCommandDescription = () => {
        const cmd = new SlashCommandBuilder()
            .setName('award')
            .setDescription('Give and list awards')
            cmd.addSubcommand(cmd => {
                return cmd
                .setName(AwardSubCommandType.GIVE)
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
                });
            })
            .addSubcommand(cmd => {
                return cmd
                .setName(AwardSubCommandType.LIST)
                .setDescription('show your awards (or another user\'s)')
                .addUserOption(option => {
                    return option
                        .setName('user')
                        .setDescription('who are you awarding')
                        .setRequired(false);
                });
            });
            return cmd;

    };
    executeSlashCommand = async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ephemeral: true});
        const cmd = interaction.options.getSubcommand(true);
        if(cmd === AwardSubCommandType.GIVE) {
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
            interaction.guild?.systemChannel?.send(`${user.username} has been given an award!`)
        }
        else if(cmd === AwardSubCommandType.LIST) {
            const user = interaction.options.getUser('user', false);
            const records = await this.connector.find(Database.Queries.AWARDS_BY_USER(user ? user.id : interaction.user.id));
            if(records?.[0]) {
                const embed = new EmbedBuilder({
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
}

// #endregion

// #region incidents
enum IncidentSubCommandTypes {
    LAST = 'last',
    NEW = 'new'
}
export class IncidentCommand implements Command {
    private connector: DBConnector<Incident>;
    name: string = 'incident';
    constructor(connector: DBConnector<Incident>) {
        this.connector = connector;
    }
    description = 'How many days since our last incident?';
    help = 'incident';
    execute = (message: Message<boolean>, args?: string[] | undefined) => {
        // will not implement, slash commands are cooler
        return;
    }
    slashCommandDescription = () => {
        const cmd = new SlashCommandBuilder()
            .setName('incident')
            .setDescription('check how many days have passed since our last `incident`')
        cmd.addSubcommand(cmd =>
            cmd.setName('last')
            .setDescription('days since last `incident`')
        )
        .addSubcommand(cmd =>
            cmd.setName('new')
            .setDescription('indicates that a new incident has occurred')
            .addStringOption(option => option.setName('link').setDescription('message link to start of incident'))
            .addStringOption(option => option.setName('note').setDescription('what went down'))
        )
        return cmd;
    };
    executeSlashCommand = async (interaction: ChatInputCommandInteraction) => {
        const cmd = interaction.options.getSubcommand(true);
        if(cmd === IncidentSubCommandTypes.LAST) {
            //not a private response
            await interaction.deferReply({ephemeral: false});
            // find the last incident
            const incident = await this.connector.getLastItem();
            if(!incident) {
                // uh, we got a problem
                interaction.followUp({content: 'No incidents yet. Hmm...', ephemeral: true});
                return;
            }
            // do some math
            const timeSince = Date.now() - new Date(incident?.occurrence).getTime();
            const daysSince = timeSince / (1000 * 60 * 60 * 24);
            // tell everyone
            interaction.followUp({
                content: `It has been ${Math.round(daysSince)} day${daysSince === 1 ? '' : 's'} since the last incident.\n***${incident.note ?? 'No note provided for this incident.'}***${incident.link ? `\n${incident.link}` : ``}`,
                ephemeral: false
            });
        }
        else if(cmd === IncidentSubCommandTypes.NEW) {
            // private response
            await interaction.deferReply({ephemeral: true});

            // mod only
            const { member } = interaction;
            if((member?.roles as GuildMemberRoleManager).cache.has(RoleIds.MOD)) {
                //create a new incident
                const incident: Incident = {
                    occurrence: new Date(),
                    note: interaction.options.getString('note') ?? undefined,
                    link: interaction.options.getString('link') ?? undefined
                };
                // db transaction
                const result = await this.connector.addItem(incident);
                if(result){
                    //make a statement confirming db transaction
                    interaction.followUp(`Created incident id ${result.id}: ${result.note} at ${result.occurrence}`);
                    //let everyone know we've reset to 0
                    interaction.guild?.systemChannel?.send(`Congratulations! It has now been \`0\` days since our last incident!\n***${result.note ?? 'No note provided for this incident.'}***${result.link ? `\n${result.link}` : ``}`);
                }
                else {
                    // db transaction failed
                    interaction.followUp('Error creating incident record');
                }
            }
            else {
                // non-mod tried to add a new incident
                interaction.followUp('You cannot perform this action. Ping a mod');
            }
        }
        else {
            // idk somehow you used the command without a subcommand
            interaction.followUp('Subcommand required. RTFM');
        }
    }
}
// #endregion

export class TelemetryCommand implements Command {
    private connector: DBConnector<Telemetry>;
    name: string = 'channelstats';
    constructor(connector: DBConnector<Telemetry>) {
        this.connector = connector;
    }
    description = 'Get Channel Telemetry Info';
    help = 'channelstats';
    slashCommandDescription = () => {
        return new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultPermission(false)
        .addChannelOption(opt => 
            opt.setName('channel')
                .setDescription('channel to get telemetry for')
                .setRequired(true));
    }
    executeSlashCommand = async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();
        const channel = interaction.options.getChannel('channel', true);
        const {id: cat} = channel;
        const results = await this.connector.find(Database.Queries.TELEMETRY_BY_CHANNEL(cat));
        
        const embed = new EmbedBuilder()
            .setTitle(`Message telemetry for ${channel.name}`)
            .setFields(
                results
                    ? results.map((telemetry) => {
                          return {
                              name: moment
                                  .utc(telemetry.Window_End_Time)
                                  .format("YYYY-MM-DD : HH:mm"),
                              value: `Messages: ${telemetry.COUNT_channelId}`,
                          };
                      })
                    : [
                          {
                              name: "No messages found",
                              value: "☹️",
                          },
                      ]
            );
        await interaction.followUp({embeds: [embed]});

    }
}