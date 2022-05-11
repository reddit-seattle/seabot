import { Resource } from "@azure/cosmos";
import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, CommandInteraction, MessageEmbed, GuildMemberRoleManager, PartialMessage, CacheType, Interaction } from "discord.js";
import DBConnector from "../db/DBConnector";
import { Command, ReactionCommand } from "../models/Command";
import { Award, ChanclaConfig, Config, Incident } from "../models/DBModels";
import { ChannelIds, Database, EmojiIDs, RoleIds } from "../utils/constants";


// #region awards - WIP

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
    executeSlashCommand = async (interaction: CommandInteraction) => {
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
    executeSlashCommand = async (interaction: CommandInteraction) => {
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
                content: `It has been ${Math.round(daysSince)} day${daysSince > 1 ? 's' : ''} since the last incident.\n***${incident.note ?? 'No note provided for this incident.'}***${incident.link ? `\n${incident.link}` : ``}`,
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
                    note: interaction.options.getString('note') ?? undefined
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

export class ChanclaCommand implements ReactionCommand {
    private connector: DBConnector<Config>;
    name: string = 'chancla';
    constructor(connector: DBConnector<Config>) {
        this.connector = connector;
    }
    description = 'Hit \'em with la chancla';
    help = 'chancla';
    adminOnly = false;
    emojiId: string = EmojiIDs.LACHANCLA;
    removeReaction = false;
    execute = async (message: Message | PartialMessage) => {
        const {member, author} = message;
        if(author?.bot || message.channelId == ChannelIds.HALL_OF_SHAME){
            return;
        }
        if(member?.id) {
            let config = await this.connector.runSPROC('addchancla', [member.id]);
            console.dir(config);
        }
    }
}

export class ShowChanclasCommand implements Command {
    private connector: DBConnector<Config>;
    name: string = 'chancla';
    constructor(connector: DBConnector<Config>) {
        this.connector = connector;
    }
    description = 'Hit \'em with la chancla';
    help = 'chancla';
    adminOnly = false;
    emojiId: string = EmojiIDs.LACHANCLA;
    removeReaction = false;
    slashCommandDescription = () => {
        const cmd = new SlashCommandBuilder()
            .setName('chancla')
            .setDescription('hit em with la chancla');
            cmd.addSubcommand(sub => 
                sub
                .setName('score')
                .setDescription('Show your chancla score')
                .addUserOption(option => 
                    option.setName('user')
                    .setDescription('who to show chancla scores for')
                    .setRequired(false)
                )
            );
        return cmd;
    };
    executeSlashCommand = async (interaction: CommandInteraction) => {
        //currently only 'score'
        await interaction.deferReply({ephemeral: false});
        const cmd = interaction.options.getSubcommand(true);
        const lookup = interaction.options.getUser('user', false);
        const memberId = lookup ? lookup.id : interaction.member?.user.id;
        if(memberId) {
            try{
            const config = await this.connector.find({
                query: 'SELECT * FROM root r where r.id = "0"'
            });
            if(!config?.[0]){interaction.followUp({ephemeral: true, content: 'something went wrong :('})}
            const num = (config?.[0] as unknown as ChanclaConfig).users[memberId] ?? 'No';
            await interaction.followUp( {ephemeral: false, content: `${num} chanclas for ${lookup? lookup.username : interaction.user.username}`})
            }
            catch(ex: any){interaction.followUp({ephemeral: true, content: 'something went wrong :('})}
            finally {

            }
        }
    }
}