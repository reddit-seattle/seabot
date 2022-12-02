import { TextChannel, ActivityType, Events } from "discord.js";
import { schedule } from "node-cron";
import { exit } from "process";
import { promises as fs } from "fs";

import DiscordBot from "./discord/DiscordBot";
import DiscordEventRouter from "./discord/DiscordEventRouter";
import ExpressServer from "./ExpressServer";
import ISeabotConfig from "./ISeabotConfig";

import { ChannelIds, Environment, GuildIds } from "./utils/constants";
import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { processModReportInteractions } from "./utils/helpers";
import { clearChannels } from "./commands/messageContent/AutoClearChannels";

const expressServer = new ExpressServer();
let configuration: ISeabotConfig;
export { configuration, discordBot };

startServer();
let discordBot: DiscordBot;

async function startServer() {
    configuration = await loadConfiguration(__dirname);

    startExpressServer();
    discordBot = new DiscordBot();
    await startDiscordBot();
}

async function startDiscordBot() {
    console.log("Starting bot...");
    try {
        const eventRouter = new DiscordEventRouter(discordBot.client);
        eventRouter.addEventListener(Events.InteractionCreate, processModReportInteractions);
        eventRouter.addEventListener(Events.VoiceStateUpdate, handleVoiceStatusUpdate);
        eventRouter.addEventListener(Events.ClientReady, announcePresence);
        eventRouter.addEventListener(Events.ClientReady, startCronJobs);

        await discordBot.start(eventRouter);
    } catch (error) {
        console.error("Fatal error while starting bot:");
        console.error(error);
        exit(1);
    }
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

async function loadConfiguration(path: string): Promise<ISeabotConfig> {
    path = `${path}\\seabotConfig.json`;
    console.log(`Loading configuration file from "${path}"...`);
    let configuration = null;

    try {
        await fs.access(`${path}`);
        configuration = JSON.parse((await fs.readFile(path)).toString());
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

// TODO: This should be expanded into a general scheduling system.
function startCronJobs() {
    schedule("*/1 * * * *", () => {
        clearChannels(discordBot.client);
    });
}
