import { ChannelIds, Environment, GuildIds } from "./utils/constants";

import { TextChannel, ActivityType, Events } from "discord.js";
import { schedule } from "node-cron";
import { exit } from "process";
import { promises as fs } from "fs";

import slashCommands from "./commands/slash";
import reactionCommands from "./commands/reaction";
import contentCommands from "./commands/messageContent";

import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { processModReportInteractions } from "./utils/helpers";
import DiscordBot from "./discord/DiscordBot";
import { clearChannels } from "./commands/messageContent/AutoClearChannels";
import CommandRouter from "./commands/CommandRouter";
import DiscordEventRouter from "./discord/DiscordEventRouter";
import ExpressServer from "./ExpressServer";
import ISeabotConfig from "./ISeabotConfig";

const discordBot = new DiscordBot();
const expressServer = new ExpressServer();
let configuration: ISeabotConfig;
export { configuration, discordBot };

startServer();

async function startServer() {
    configuration = await loadConfiguration();
    console.log("Loaded configuration file.");
    
    startExpressServer();
    await startDiscordBot();
}

async function startDiscordBot() {
    try {
        const eventRouter = new DiscordEventRouter(discordBot.client);
        eventRouter.addEventListener(Events.InteractionCreate, processModReportInteractions);
        eventRouter.addEventListener(Events.VoiceStateUpdate, handleVoiceStatusUpdate);
        eventRouter.addEventListener(Events.ClientReady, () => startCommandRouter(eventRouter));
        eventRouter.addEventListener(Events.ClientReady, announcePresence);
        eventRouter.addEventListener(Events.ClientReady, startCronJobs);

        await discordBot.start(eventRouter);
    } catch (error) {
        console.error("Fatal error while starting bot:");
        console.error(error);
        exit(1);
    }
}

function startCommandRouter(eventRouter: DiscordEventRouter) {
    const commandRouter = new CommandRouter(eventRouter, discordBot, {
        slashCommands,
        reactionCommands,
        contentCommands,
    });
}

function startExpressServer() {
    try {
        expressServer.start();
    } catch (error) {
        console.error("Fatal error while starting Express server:");
        console.error(error);
        exit(1);
    }
}

async function loadConfiguration(): Promise<ISeabotConfig> {
    let configuration = null;

    try {
        await fs.access("seabotConfig.json");
        configuration = JSON.parse((await fs.readFile("seabotConfig.json")).toString());
    } catch (error) {
        console.warn("Configuration file not found, or is malformed. Continuing with default configuration...");
    }

    return configuration;
}

function announcePresence() {
    console.log("connected to servers:");
    discordBot.client.guilds.cache.forEach(async (guild) => {
        console.log(guild.name);
        //announce when seabot process starts (only on /r/seattle currently)
        if (!Environment.DEBUG && guild.id === GuildIds.Seattle) {
            const debugChannel = await guild.channels.fetch(ChannelIds.DEBUG);
            (debugChannel as TextChannel)?.send("Greetings - SEABot is back online");
        }
    });

    discordBot.client.user?.setPresence({
        activities: [{ name: "with discord.js", type: ActivityType.Playing }],
        status: "online",
    });
}

function startCronJobs() {
    schedule("*/5 * * * *", () => {
        clearChannels(discordBot.client);
    });
}
