import { Client, Events, GuildScheduledEvent, Interaction, Message, REST } from "discord.js";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v9";
import { Command, CommandDictionary } from "./Command";
import ReactionCommand from "./reaction/ReactionCommand";
import { Environment, UserIDs } from "../utils/constants";
import { isModReaction } from "../utils/helpers";
import CreateServerEvent from "./reaction/CreateServerEvent";
import DiscordEventRouter from "../discord/DiscordEventRouter";
import ContentCommand from "./messageContent/ContentCommand";
import DiscordBot from "../discord/DiscordBot";

interface CommandRouterConfiguration {
    slashCommands: Command[],
    reactionCommands: ReactionCommand[],
    contentCommands: ContentCommand[]
};

export default class CommandRouter {
    private _discordBot: DiscordBot;
    private _eventRouter: DiscordEventRouter;

    constructor(eventRouter: DiscordEventRouter, discordBot: DiscordBot, configuration: CommandRouterConfiguration) {
        this._eventRouter = eventRouter;
        this._discordBot = discordBot;
        this.initialize(configuration);
    }

    private async initialize(configuration: CommandRouterConfiguration) {
        this.registerSlashCommands(configuration.slashCommands);
        this.listenForReactionCommands(configuration.reactionCommands);
        this.listenForContentCommands(configuration.contentCommands);
    }

    private async registerSlashCommands(slashCommands: Command[]) {
        const commandMap = slashCommands.reduce((map, obj) => {
            map[obj.name.toLowerCase()] = obj;
            return map;
        }, {} as CommandDictionary);

        async function tryToExecuteSlashCommand(interaction: Interaction) {
            if (!interaction.isChatInputCommand()) return;
    
            const command = commandMap[interaction.commandName];
            if (command) {
                command.executeSlashCommand?.(interaction);
            }
        }

        this._eventRouter.addEventListener(Events.InteractionCreate, tryToExecuteSlashCommand);
    
        this._discordBot.client.guilds.cache.forEach(async (guild) => {
            const registeredCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
            for (const commandName in slashCommands) {
                const command = slashCommands[commandName];
                if (command?.slashCommandDescription) {
                    console.log(`Slash command "${command.name}" registered`);
                    const desc = await command.slashCommandDescription();
                    if (desc) {
                        registeredCommands.push(desc.toJSON());
                    }
                }
            }
            const result = await this._discordBot.rest.put(Routes.applicationGuildCommands(this._discordBot.client.user!.id, guild.id), {
                body: registeredCommands,
            });
        });
    }

    private async listenForReactionCommands(reactionCommands: ReactionCommand[]) {
        const commandMap = new Map<string, ReactionCommand>();
        reactionCommands.forEach(command => {
            commandMap.set(command.emojiName, command);
        });

        this._eventRouter.addEventListener(Events.MessageReactionAdd, async (reaction: any, user: any) => {
            const { message, emoji } = reaction;
            const alreadyReacted = (reaction.count && reaction.count > 1) == true;
        
            //dangerous - allow seabot to react to a bot's commands for creating server events
            if (
                !alreadyReacted &&
                message.author?.id === UserIDs.APOLLO &&
                emoji.name === CreateServerEvent &&
                isModReaction(reaction, user) &&
                !Environment.DEBUG
            ) {
                const event = CreateServerEvent.execute
                    ? ((await CreateServerEvent.execute(message as Message)) as GuildScheduledEvent)
                    : null;
                try {
                    if (event) {
                        //confirm event creation
                        await message.react("✅");
                        //attempt to message user who created it with link
                        await user.send(`Event created: ${event.url}`);
                    }
                } catch (e: any) {
                    console.dir(e);
                } finally {
                    //stop processing  reactions after this
                    return;
                }
            }
        
            // this prevents the same reaction command from firing multiple times
            if (message.author?.bot || !emoji.id || alreadyReacted) {
                return;
            }

            try {
                if (commandMap.has(emoji.name)) {
                    const command = commandMap.get(emoji.id) as ReactionCommand;
                    if (command.execute) {
                        command.execute(message);
                    }

                    if (command.removeReaction) {
                        await reaction.remove();
                    }
                }
            } catch (e: any) {
                console.dir(e);
                message.react("💩");
            }
        });
    }

    private async listenForContentCommands(contentCommands: ContentCommand[]) {
        this._eventRouter.addEventListener(Events.MessageCreate, async (message: Message) => {
            if (message.author.bot) return;
            if (message.partial) message = await message.fetch();

            for (const command of contentCommands) {
                try {
                    if ((command.trigger instanceof RegExp)) {
                        if (command.trigger.test(message.content)) {
                            command.handler(message);
                        }
                    } else if (message.content === command.trigger) {
                        command.handler(message);
                    }
                } catch (error) {
                    console.error(`Error while handling command ${command.trigger}`);
                }
            }
        });
    }


}
