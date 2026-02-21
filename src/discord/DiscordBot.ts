import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  GuildMember,
  MessageCreateOptions,
  MessagePayload,
  Partials,
  REST,
  ThreadChannel,
} from "discord.js";

import createCommandRouters from "../commands/createCommandRouters";
import { initEventsTitleEnforcer } from "../commands/slash/events";
import InMemoryDbConnector from "../db/InMemoryDbConnector";
import { Logger } from "../utils/logger";
import DiscordEventRouter from "./DiscordEventRouter";
import ErrorLogger from "./ErrorLogger";

import { configuration } from "../server";
import { Environment } from "../utils/constants";
import { minutesToMilliseconds } from "../utils/Time/conversion";
export default class DiscordBot {
  private _client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.GuildMember],
  });
  public get client() {
    return this._client;
  }

  private _rest: REST | undefined;
  public get rest() {
    if (this._rest == undefined) {
      throw new Error("You must log in before attempting to use the REST Api.");
    }

    return this._rest;
  }

  private _errorLogger;
  public get errorLogger() {
    return this._errorLogger;
  }

  constructor() {
    /*
        TODO: This code can be enabled once there is a cosmos database set up to receive errors.
        const errorDbConnector = process.env.DEBUG
            ? new InMemoryDbConnector<Error>()
            : new DBConnector<Error>(cosmosClient as CosmosClient, Database.DATABASE_ID, "Logs");
        */
    this._errorLogger = new ErrorLogger(new InMemoryDbConnector<Error>());
  }

  public async login(botToken: string) {
    Logger.info("Logging in to Discord API...");
    await this._client.login(botToken);
    this._rest = new REST({ version: "10" }).setToken(botToken);
    Logger.info("Login success.");
  }

  public async start(eventRouter: DiscordEventRouter) {
    if (process.env.DEBUG) {
      this.client.on(Events.Debug, (message: string) => Logger.debug(message));
      this.client.on(Events.Warn, (message: string) => Logger.warn(message));
    }

    if (!Environment.botToken || Environment.botToken == "") {
      Logger.error(`env var "botToken" missing`);
      process.exit(1);
    }

    await this.login(Environment.botToken);
    this.startCommandRouters(eventRouter);

    process.on("unhandledRejection", console.error);
    process.on("unhandledRejection", async (error: Error) =>
      this._errorLogger.logError(error),
    );

    eventRouter.addEventListener(
      Events.GuildMemberAdd,
      this.showNewMemberMessage,
    );
    eventRouter.addEventListener(
      Events.GuildMemberRemove,
      this.showRevolvingSimpsonsDoor,
    );
    eventRouter.addEventListener(Events.ThreadCreate, this.logThreadCreation);
    eventRouter.addEventListener(Events.ThreadDelete, this.logThreadDeletion);
    initEventsTitleEnforcer(eventRouter);
  }

  private startCommandRouters(eventRouter: DiscordEventRouter) {
    Logger.info("Starting command router...");
    createCommandRouters(eventRouter, this);
  }

  private async showRevolvingSimpsonsDoor(member: GuildMember) {
    if (!member.joinedAt) return;

    if (Date.now() - member.joinedAt.getTime() < minutesToMilliseconds(5)) {
      const { guild, nickname, user } = member;
      guild?.systemChannel?.send(`Thanks for stopping by, ${
        nickname ?? user.username
      }
        https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif`);
    }
  }

  private async logThreadDeletion(thread: ThreadChannel) {
    const { guild, name, lastMessage, id } = thread;
    const owner = thread.ownerId
      ? await guild.members.cache.get(thread.ownerId)
      : undefined;
    await modLogEntry(guild, {
      embeds: [
        new EmbedBuilder({
          title: `Thread deleted`,
          description: name,
          fields: [
            {
              name: "Created",
              value: thread.createdAt?.toDateString() ?? "`idk`",
            },
            {
              name: "Owner",
              value: owner?.user?.username ?? "`idk`",
            },
            {
              name: "Messages",
              value: `${thread.messageCount}`,
            },
            {
              name: "Last message",
              value:
                lastMessage?.content ?? "`Could not retrieve last message`",
            },
            {
              name: "Thread ID",
              value: id,
            },
          ],
        }),
      ],
    });
  }

  private async logThreadCreation(
    thread: ThreadChannel,
    newlyCreated: boolean,
  ) {
    if (newlyCreated) {
      const { guild, name, id } = thread;
      const owner = await thread.fetchOwner();
      await modLogEntry(guild, {
        embeds: [
          new EmbedBuilder({
            title: `${
              thread.type === ChannelType.PrivateThread ? "Private " : ""
            }Thread created`,
            description: name,
            fields: [
              {
                name: "Owner",
                value: owner?.user?.username ?? "`idk`",
              },
              {
                name: "Created",
                value: thread.createdAt?.toDateString() ?? "`idk`",
              },
              {
                name: "Link",
                value: `[View Thread in ${thread.parent?.name ?? "channel"}](${
                  thread.url
                })`,
              },
              {
                name: "Thread ID",
                value: id,
              },
            ],
          }),
        ],
      });
    }
  }

  private async showNewMemberMessage(member: GuildMember) {
    if (Date.now() - member.user!.createdTimestamp < minutesToMilliseconds(5)) {
      member.send(`
            Hey ${
              member.user!.username
            } - just a reminder, your account needs to be at least 5 minutes old to chat. 
            While you wait, feel free to browse our welcome channel for some basic rules and channel descriptions.`);
    }
  }
}

const modLogEntry = async (
  guild: Guild,
  content: string | MessagePayload | MessageCreateOptions,
) => {
  const modLogChannelId = configuration.channelIds?.["MOD_LOG"];
  if (!modLogChannelId) return;
  const logChannel = await guild.channels.fetch(modLogChannelId);
  if (logChannel?.isTextBased()) {
    await logChannel.send(content);
  }
};
