import { Client, Events, GatewayIntentBits, GuildMember, Partials, REST } from "discord.js";
import { EventHubProducerClient } from "@azure/event-hubs";

import { Database, Environment } from "../utils/constants";
import DiscordEventRouter from "./DiscordEventRouter";
import ErrorLogger from "./ErrorLogger";
import { MessageTelemetryLogger } from "../utils/MessageTelemetryLogger";
import { cosmosClient } from "../db/cosmosClient";
import InMemoryDbConnector from "../db/InMemoryDbConnector";
import DBConnector from "../db/DBConnector";
import { CosmosClient } from "@azure/cosmos";

const FIVE_MINUTES = 1000 * 60 * 5;
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
        partials: [Partials.Message, Partials.Reaction],
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
            : new DBConnector<Error>(cosmosClient as CosmosClient, Database.DATABASE_ID, "Errors");
        */
        this._errorLogger = new ErrorLogger(new InMemoryDbConnector<Error>());
    }

    public async login(botToken: string) {
        console.log("Logging in to Discord API...");
        await this._client.login(botToken);
        this._rest = new REST({ version: "9" }).setToken(botToken);
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

        process.on("unhandledRejection", console.error);
        process.on("unhandledRejection", async (error: Error) => this._errorLogger.logError(error));

        eventRouter.addEventListener(Events.GuildMemberAdd, this.onMemberJoined);
        eventRouter.addEventListener(Events.GuildMemberRemove, this.onMemberLeft);
        if (Environment.sendTelemetry && logger) {
            eventRouter.addEventListener(Events.MessageCreate, logger.logMessageTelemetry);
        }
    }

    async onMemberLeft(member: GuildMember) {
        if (member.partial) {
            member = await member.fetch();
        }

        if (Date.now() - member.joinedAt?.getTime()! < FIVE_MINUTES) {
            const { guild } = member;
            guild?.systemChannel?.send("https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif");
        }
    }

    async onMemberJoined(member: GuildMember) {
        if (Date.now() - member.user!.createdTimestamp < FIVE_MINUTES) {
            member.send(`
            Hey ${member.user!.username} - just a reminder, your account needs to be at least 5 minutes old to chat. 
            While you wait, feel free to browse our welcome channel for some basic rules and channel descriptions.`);
        }
    }
}
