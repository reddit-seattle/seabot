import { ActivityType, ChannelType, Events } from "discord.js";
import { exit } from "process";

import loadConfiguration from "./configuration/loadConfiguration";
import scheduledTasks from "./schedules/";

import ISeabotConfig from "./configuration/ISeabotConfig";
import db from "./db/sqlite";
import DiscordBot from "./discord/DiscordBot";
import DiscordEventRouter from "./discord/DiscordEventRouter";
import ExpressServer from "./ExpressServer";
import TaskScheduler from "./schedules/TaskScheduler";
import { Logger } from "./utils/logger";

import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { processModReportInteractions } from "./utils/helpers";

let expressServer: ExpressServer;
let configuration: ISeabotConfig;
let discordBot: DiscordBot;
let taskScheduler: TaskScheduler | null = null;

export { configuration, discordBot, expressServer };

startServer();

async function startServer() {
  configuration = await loadConfiguration(__dirname);

  expressServer = new ExpressServer(configuration);
  startExpressServer();
  discordBot = new DiscordBot();
  await startDiscordBot();

  // Update express server with Discord bot reference
  expressServer.setDiscordBot(discordBot);
}

async function startDiscordBot() {
  Logger.info("Starting bot...");
  try {
    const eventRouter = new DiscordEventRouter(discordBot.client);
    eventRouter.addEventListener(
      Events.InteractionCreate,
      processModReportInteractions,
    );
    eventRouter.addEventListener(
      Events.VoiceStateUpdate,
      handleVoiceStatusUpdate,
    );
    eventRouter.addEventListener(Events.ClientReady, announcePresence);
    eventRouter.addEventListener(Events.ClientReady, startTaskScheduler);

    // Simple telemetry - track messages (production only)
    eventRouter.addEventListener(Events.MessageCreate, (message: any) => {
      if (message.author.bot) return;
      if (message.channel?.type !== ChannelType.GuildText) return;
      expressServer.getTelemetry()?.logMessage(message);
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

async function announcePresence() {
  Logger.info("connected to servers:");
  discordBot.client.guilds.cache.forEach((guild) => {
    Logger.info(guild.name);
  });

  if (configuration?.channelIds?.["DEBUG"]) {
    try {
      const debugChannel = await discordBot.client.channels.fetch(
        configuration.channelIds["DEBUG"],
      );
      if (debugChannel?.isTextBased() && "send" in debugChannel) {
        await debugChannel.send("Greetings - SEABot is back online");
      }
    } catch (error) {
      Logger.error("Error announcing presence:", error);
    }
  }

  discordBot.client.user?.setPresence({
    activities: [{ name: "with discord.js", type: ActivityType.Playing }],
    status: "online",
  });
}

function startTaskScheduler() {
  Logger.info("Starting task scheduler...");
  taskScheduler = new TaskScheduler(scheduledTasks);
}

function gracefulShutdown(signal: string) {
  Logger.info(`Received ${signal}, shutting down gracefully...`);
  taskScheduler?.stop();
  discordBot?.client?.destroy();
  try {
    db.close();
  } catch {
    /* already closed */
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
