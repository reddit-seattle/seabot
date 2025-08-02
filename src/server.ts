import { TextChannel, ActivityType, Events } from "discord.js";
import { exit } from "process";

import scheduledTasks from "./schedules/";
import loadConfiguration from "./configuration/loadConfiguration";

import DiscordBot from "./discord/DiscordBot";
import DiscordEventRouter from "./discord/DiscordEventRouter";
import ExpressServer from "./ExpressServer";
import ISeabotConfig from "./configuration/ISeabotConfig";
import TaskScheduler from "./schedules/TaskScheduler";
import { Logger } from "./utils/logger";

import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { processModReportInteractions } from "./utils/helpers";

const expressServer = new ExpressServer();
let configuration: ISeabotConfig;

export { configuration, discordBot, expressServer };

startServer();
let discordBot: DiscordBot;

async function startServer() {
  configuration = await loadConfiguration(__dirname);

  startExpressServer();
  discordBot = new DiscordBot();
  await startDiscordBot();
}

async function startDiscordBot() {
  Logger.info("Starting bot...");
  try {
    const eventRouter = new DiscordEventRouter(discordBot.client);
    eventRouter.addEventListener(
      Events.InteractionCreate,
      processModReportInteractions
    );
    eventRouter.addEventListener(
      Events.VoiceStateUpdate,
      handleVoiceStatusUpdate
    );
    eventRouter.addEventListener(Events.ClientReady, announcePresence);
    eventRouter.addEventListener(Events.ClientReady, startTaskScheduler);
    
    // Simple telemetry - track messages (production only)
    eventRouter.addEventListener(Events.MessageCreate, (message: any) => {
      if (!message.author.bot) {
        expressServer.getTelemetry()?.logMessage(message);
      }
    });

    await discordBot.start(eventRouter);
  } catch (error) {
    Logger.error("Fatal error while starting bot:", error);
    exit(1);
  }
}

function startExpressServer() {
  try {
    expressServer.start();
  } catch (error) {
    Logger.error("Fatal error while starting Express server:", error);
    exit(1);
  }
}

function announcePresence() {
  Logger.info("connected to servers:");
  discordBot.client.guilds.cache.forEach(async (guild) => {
    Logger.info(guild.name);
    //announce when seabot process starts (debug channel must be set)
    if (configuration?.channelIds?.["DEBUG"]) {
      const debugChannel = await guild.channels.fetch(
        configuration.channelIds?.["DEBUG"]
      );
      (debugChannel as TextChannel)?.send("Greetings - SEABot is back online");
    }
  });

  discordBot.client.user?.setPresence({
    activities: [{ name: "with discord.js", type: ActivityType.Playing }],
    status: "online",
  });
}

function startTaskScheduler() {
  Logger.info("Starting task scheduler...");
  new TaskScheduler(scheduledTasks);
}
