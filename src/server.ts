import { REST, Client, GuildScheduledEvent, TextChannel, ActivityType, Message } from "discord.js";
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from "discord-api-types/v9";
import express from "express";
import { schedule } from "node-cron";

import { ChannelIds, Environment, GuildIds, UserIDs } from "./utils/constants";
import { CommandDictionary } from "./models/Command";
import ReactionCommands from "./commands/reactions/";
import CreateServerEvent from "./commands/reactions/CreateServerEvent";
import SlashCommands from "./commands/slash";
import { clearChannel, deleteMessages } from "./commands/rantChannelCommands";
import { abeLeaves, newAccountJoins } from "./commands/joinLeaveCommands";
import { handleVoiceStatusUpdate } from "./functions/voiceChannelManagement";
import { isModReaction, processModReportInteractions, SetHueTokens } from "./utils/helpers";
import { exit } from "process";
import { CosmosClient } from "@azure/cosmos";
import { processMessageReactions } from "./utils/reaccs";

import { EventHubProducerClient } from "@azure/event-hubs";
import { MessageTelemetryLogger } from "./utils/MessageTelemetryLogger";
import { ReactionCommandDictionary } from "./commands/reactions/ReactionCommand";
import CommandManager from "./commands/CommandManager";

const eventHubMessenger = new EventHubProducerClient(
    Environment.ehConnectionString,
    Environment.Constants.telemetryEventHub
);

const client = new Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "GuildPresences",
        "GuildVoiceStates",
        "GuildMembers",
        "GuildMessageReactions",
        "GuildScheduledEvents",
    ],
});

// database
const cosmosClient = new CosmosClient({
    endpoint: Environment.cosmosHost,
    key: Environment.cosmosAuthKey,
});
export { cosmosClient };

//#region commands


const reactionCommands: ReactionCommandDictionary = ReactionCommands.reduce((map, obj) => {
    map[obj.emojiId.toLowerCase()] = obj;
    return map;
}, {} as ReactionCommandDictionary);
//#endregion
const { botToken } = Environment;
//MAIN

//check for bot token
if (!botToken || botToken == "") {
    console.log(`env var "botToken" missing`);
    exit(1);
} else {
    //login and go
    client.login(botToken);
}

//hook up api
const rest = new REST({ version: "9" }).setToken(botToken);

const logger = new MessageTelemetryLogger(eventHubMessenger);

// #region interaction handling
//handle messages
client.on("messageCreate", async (message) => {
    //bad bot
    if (message.author.bot) return;

    const { channel, content } = message;

    // will only log channel ID and timestamp
    // only logs message telemetry (if enabled) in specific categories
    if (Environment.sendTelemetry) {
        await logger.logMessageTelemetry(message);
    }

    if (channel instanceof TextChannel && channel?.id == ChannelIds.RANT) {
        deleteMessages(message);
    }
    if (message.content === "SEA") {
        channel.send("HAWKS!");
        return;
    }
    if (content.toLowerCase().includes("tbf") || content.toLowerCase().includes("to be fair")) {
        // we use tbf more than we should, tbf
        if (Math.random() >= 0.75) {
            channel.send("https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631");
        }
    }

    await processMessageReactions(message);
});

client.on("messageReactionAdd", async (reaction, user) => {
    const { message, emoji } = reaction;
    const alreadyReacted = (reaction.count && reaction.count > 1) == true;

    //dangerous - allow seabot to react to a bot's commands for creating server events
    if (
        !alreadyReacted &&
        message.author?.id === UserIDs.APOLLO &&
        emoji.name === CreateServerEvent.emojiId &&
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
        const command = reactionCommands?.[emoji.id];
        if (command?.execute) {
            command.execute(message as Message);
        }
        if (command?.removeReaction) {
            await reaction.remove();
        }
    } catch (e: any) {
        console.dir(e);
        message.react("💩");
    }
});

// handle mod report reactions
client.on("interactionCreate", processModReportInteractions);

//handle voice connections
client.on("voiceStateUpdate", handleVoiceStatusUpdate);
//join/leave
client.on("guildMemberRemove", abeLeaves);
client.on("guildMemberAdd", newAccountJoins);
// #endregion

//log errors to the console because i don't have anywhere better to store them for now
client.on("error", console.error);

const startCronJobs = () => {
    schedule("*/5 * * * *", () => {
        clearChannel(client);
    });
};

client.on("ready", async () => {
    await logger?.Ready;
    console.log("connected to servers:");
    client.guilds.cache.forEach(async (guild) => {
        console.log(guild.name);
        //announce when seabot process starts (only on /r/seattle currently)
        if (!Environment.DEBUG && guild.id === GuildIds.Seattle) {
            const debugChannel = await guild.channels.fetch(ChannelIds.DEBUG);
            (debugChannel as TextChannel)?.send("Greetings - SEABot is back online");
        }
    });
    client.user?.setPresence({
        activities: [{ name: "with discord.js", type: ActivityType.Playing }],
        status: "online",
    });
    startCronJobs();
    new CommandManager(client, rest);
});

// #region express routes
//stupid fix for azure app service containers requiring a response to port 8080
const webApp = express();
webApp.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.write("nothing to see here");
    res.end();
});
// hue auth flow configuration
webApp.get("/seabot_hue", async (req, res) => {
    try {
        const { code, state } = req?.query;
        if (!state || state != Environment.hueState) {
            throw new Error("Invalid state value");
        }
        const result = await SetHueTokens(code as string);
        if (result?.success) {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.write(`Successfully set Hue access and refresh tokens!`);
            res.end();
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.write(`
            Something (bad) happened trying to get auth code / set tokens:</br>
            ${JSON.stringify(e)}`);
        res.end();
    }
});

webApp.listen(8080);
// #endregion
