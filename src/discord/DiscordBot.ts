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
import { EventHubProducerClient } from "@azure/event-hubs";

import createCommandRouters from "../commands/createCommandRouters";
import DiscordEventRouter from "./DiscordEventRouter";
import ErrorLogger from "./ErrorLogger";
import InMemoryDbConnector from "../db/InMemoryDbConnector";

import { cosmosClient } from "../db/cosmosClient";
import { Environment } from "../utils/constants";
import { MessageTelemetryLogger } from "../utils/MessageTelemetryLogger";
import { minutesToMilliseconds } from "../utils/Time/conversion";
import { configuration } from "../server";

let logger: MessageTelemetryLogger | null = null;
let eventHubMessenger;

if (cosmosClient) {
  eventHubMessenger = new EventHubProducerClient(
    Environment.ehConnectionString,
    Environment.Constants.telemetryEventHub
  );
  logger = new MessageTelemetryLogger(eventHubMessenger);
}

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

  private _modLogChannelId: string | undefined;
  public get modLogChannelId() {
    return this._modLogChannelId;
  }

  constructor() {
    /*
        TODO: This code can be enabled once there is a cosmos database set up to receive errors.
        const errorDbConnector = process.env.DEBUG
            ? new InMemoryDbConnector<Error>()
            : new DBConnector<Error>(cosmosClient as CosmosClient, Database.DATABASE_ID, "Logs");
        */
    this._errorLogger = new ErrorLogger(new InMemoryDbConnector<Error>());
    this._modLogChannelId = configuration.channelIds?.["MOD_LOG"];
  }

  public async login(botToken: string) {
    console.log("Logging in to Discord API...");
    await this._client.login(botToken);
    this._rest = new REST({ version: "10" }).setToken(botToken);
    console.log("Login success.");
  }

  public async start(eventRouter: DiscordEventRouter) {
    if (process.env.DEBUG) {
      this.client.on(Events.Debug, (message: string) => console.log(message));
      this.client.on(Events.Warn, (message: string) => console.warn(message));
    }

    if (!Environment.botToken || Environment.botToken == "") {
      console.error(`env var "botToken" missing`);
      process.exit(1);
    }

    await this.login(Environment.botToken);
    this.startCommandRouters(eventRouter);

    process.on("unhandledRejection", console.error);
    process.on("unhandledRejection", async (error: Error) =>
      this._errorLogger.logError(error)
    );

    eventRouter.addEventListener(
      Events.GuildMemberAdd,
      this.showNewMemberMessage
    );
    eventRouter.addEventListener(
      Events.GuildMemberRemove,
      this.showRevolvingSimpsonsDoor
    );
    eventRouter.addEventListener(
      Events.ThreadCreate,
      async (thread: ThreadChannel, newlyCreated: boolean) => {
        if (newlyCreated) {
          const { guild, name } = thread;
          const owner = await thread.fetchOwner();
          await this.modLogEntry(guild, {
            embeds: [
              new EmbedBuilder({
                title:  `${thread.type === ChannelType.PrivateThread ? 'Private ' : ''}Thread created`,
                description: name,
                fields: [
                {
                  name: 'Owner',
                  value: owner?.user?.username ?? '`oops`'
                },
                {
                  name: 'Created',
                  value: thread.createdAt?.toDateString() ?? '`oops`',
                },
                {
                  name: 'Link',
                  value: `[View Thread in ${thread.parent?.name ?? 'channel'}](${thread.url})`
                }
                ]
              })
            ]
          });
        }
      }
    );
    eventRouter.addEventListener(
      Events.ThreadDelete,
      async (thread: ThreadChannel) => {
        const { guild, name } = thread;
        const owner = await thread.fetchOwner();
        const lastMessage = await (await thread.fetch()).lastMessage?.fetch();
        await this.modLogEntry(guild, {
          embeds: [
            new EmbedBuilder({
              title:  `Thread deleted`,
              description: name,
              fields: [
              {
                name: 'Created',
                value: thread.createdAt?.toDateString() ?? '`oops`',
              },
              {
                name: 'Owner',
                value: owner?.user?.username ?? '`oops`',
              },
              {
                name: 'Messages',
                value: `${thread.messageCount}`
              },
              {
                name: 'Last message',
                value: lastMessage?.content ?? '`oops`'
              }
              ]
            })
          ]
        });
      }
    )
    if (Environment.sendTelemetry && logger) {
      eventRouter.addEventListener(
        Events.MessageCreate,
        logger.logMessageTelemetry
      );
    }
  }

  private startCommandRouters(eventRouter: DiscordEventRouter) {
    console.log("Starting command router...");
    const commandRouters = createCommandRouters(eventRouter, this);
  }

  private async showRevolvingSimpsonsDoor(member: GuildMember) {
    if (!member.joinedAt) return;

    if (Date.now() - member.joinedAt.getTime() < minutesToMilliseconds(5)) {
      const { guild } = member;
      guild?.systemChannel?.send(
        "https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif"
      );
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

  private async modLogEntry(guild: Guild, content: string | MessagePayload | MessageCreateOptions) {
    if(!this._modLogChannelId) return;
    const logChannel = await guild.channels.fetch(this._modLogChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send(content);
    }
  }

}
