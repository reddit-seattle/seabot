import { TextChannel, ActivityType, Events } from "discord.js";
import { exit } from "process";

import scheduledTasks from "./schedules/";
import loadConfiguration from "./configuration/loadConfiguration";

import DiscordBot from "./discord/DiscordBot";
import DiscordEventRouter from "./discord/DiscordEventRouter";
import ExpressServer from "./ExpressServer";
import ISeabotConfig from "./configuration/ISeabotConfig";
import TaskScheduler from "./schedules/TaskScheduler";

import { Environment, GuildIds } from "./utils/constants";
import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { processModReportInteractions } from "./utils/helpers";

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
        await eventRouter.addEventListener(Events.InteractionCreate, processModReportInteractions);
        await eventRouter.addEventListener(Events.VoiceStateUpdate, handleVoiceStatusUpdate);
        await eventRouter.addEventListener(Events.ClientReady, announcePresence);
        await eventRouter.addEventListener(Events.ClientReady, startTaskScheduler);
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

function announcePresence() {
  console.log("connected to servers:");
  discordBot.client.guilds.cache.forEach(async (guild) => {
    console.log(guild.name);
    //announce when seabot process starts (only on /r/seattle currently)
    if (
      !Environment.DEBUG &&
      configuration?.channelIds?.["DEBUG"] &&
      guild.id === GuildIds.Seattle
    ) {
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
  console.log("Starting task scheduler...");
  new TaskScheduler(scheduledTasks);
}
