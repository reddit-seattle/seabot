import { Client, TextChannel } from 'discord.js'
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9';
import express from 'express';
import { schedule } from 'node-cron';

import { API, ChannelIds, Config, Environment, RoleIds } from './utils/constants';
import { CommandDictionary, ReactionCommandDictionary } from './models/Command';
// import { MTGCommand } from './commands/mtgCommands';
import { AirQualityCommand, ForecastCommand, WeatherCommand } from './commands/weatherCommands';
import { coffeeCommand, pingCommand, teaCommand, valheimServerCommand, botInfoCommand, sarcasmText } from './commands/utilCommands';
import { clearChannel, deleteMessages } from './commands/rantChannelCommands';
import { abeLeaves, newAccountJoins } from './commands/joinLeaveCommands';
import { Help, ReactionHelp } from './commands/helpCommands';
import { handleVoiceStatusUpdate } from './functions/voiceChannelManagement';
import { SplitMessageIntoArgs, SetHueTokens } from './utils/helpers';
import { HueEnable, HueInit, HueSet } from './commands/hueCommands';
import { RJSays } from './commands/rjCommands';
import { googleReact, lmgtfyReact } from './commands/reactionCommands';
import { exit } from 'process';
import { hueInit } from './http_handlers/hueHandlers';
import { discordAuth } from './http_handlers/discordHandler';

import Next from 'next';

const client = new Client({
  intents: [
    "GUILDS",
    "GUILD_MESSAGES",
    "GUILD_VOICE_STATES",
    "GUILD_MEMBERS",
    "GUILD_MESSAGE_REACTIONS",
  ],
});

// TODO: common command loader
const commands: CommandDictionary = [
    // MTGCommand,
    WeatherCommand,
    ForecastCommand,
    teaCommand,
    coffeeCommand,
    valheimServerCommand,
    pingCommand,
    botInfoCommand,
    AirQualityCommand,
    Help,
    ReactionHelp,
    HueInit,
    HueSet,
    HueEnable,
    RJSays,
    sarcasmText
].reduce((map, obj) => {
    map[obj.name.toLowerCase()] = obj;
    return map;
}, {} as CommandDictionary);


const reactionCommands: ReactionCommandDictionary = [
    googleReact,
    lmgtfyReact
].reduce((map, obj) => {
    map[obj.emojiId.toLowerCase()] = obj;
    return map;
}, {} as ReactionCommandDictionary);

const { botToken } = Environment;
//MAIN

//check for bot token
if (!botToken || botToken == '') {
    console.log(`env var "botToken" missing`);
    exit(1);
}
else {
    //login and go
    client.login(botToken);
}

//hook up api
const rest = new REST({ version: '9' }).setToken(botToken);

//handle voice connections
client.on('voiceStateUpdate', handleVoiceStatusUpdate);

//join/leave
client.on('guildMemberRemove', abeLeaves);
client.on('guildMemberAdd', newAccountJoins);

//handle messages
client.on('messageCreate', async (message) => {
    if (message.channel instanceof TextChannel && message?.channel?.id == ChannelIds.RANT) {
        deleteMessages(message);
        // return; // maybe we should allow other commands in #rant
    }
    else if (message.content === 'SEA') {
        message.channel.send('HAWKS!')
        return;
    }
    else if (message.content.toLowerCase().includes('tbf') || message.content.toLowerCase().includes('to be fair')) {
        // we use tbf more than we should, tbf
        if (Math.random() >= 0.75) {
            message.channel.send('https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631');
        }
        return;
    }

    //bad bot
    if (!message.content.startsWith(Config.prefix) || message.author.bot) return;


    const args = SplitMessageIntoArgs(message);
    
    //grab actual command and separate it from args
    const commandArg = args?.shift()?.toLowerCase() || '';
    const command = commands?.[commandArg];
    
    //send it
    try {
        if(command?.adminOnly && !message.member?.roles.cache.has(RoleIds.MOD)){
            message.channel.send('nice try, loser');
            return;
        }
        else {
            command?.execute(message, args);
        }
    }
    catch (e: any) {
        console.dir(e);
        message.react('💩');
    }

});

client.on('messageReactionAdd', async (reaction) => {
    const {message, emoji} = reaction;
    const alreadyReacted =  (reaction.count && reaction.count > 1) == true;
    // this prevents the same reaction command from firing multiple times
    if(!emoji.id || alreadyReacted) {
        return;
    }
    try{
        const command = reactionCommands?.[emoji.id];
        command?.execute(message);
        if(command?.removeReaction) {
            await reaction.remove();
        }
    }
    catch(e: any){
        console.dir(e);
        message.react('💩')
    }
});

//log errors to the console because i don't have anywhere better to store them for now
client.on('error', console.error);

const startCronJobs = () => {
    schedule('*/5 * * * *', () => {
        clearChannel(client);
    })
}

const registerAllSlashCommands = async (client: Client) => {
    client.guilds.cache.forEach(async guild => {
        const slashCommands: RESTPostAPIApplicationCommandsJSONBody[] = [];
        for(const commandName in commands) {
            const command = commands[commandName];
            if(command?.slashCommandDescription) {
                // console.log(`adding ${command.name} slash command registration`)
               slashCommands.push(command.slashCommandDescription().toJSON())
            }
        }
        // console.log('all commands: ')
        // console.dir(slashCommands);
        const result = await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guild.id),
            {
                body: slashCommands
            }
        )
        // console.dir(result);

    });
}

client.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;

    const command = commands?.[interaction.commandName];
    if(command) {
        command.executeSlashCommand?.(interaction);
    };
})

client.on('ready', async () => {
    console.log('connected to servers:');
    client.guilds.cache.forEach(guild => {
        console.log(guild.name);
    });
    client.user?.setPresence({ activities: [{ name: 'bot stuff' }], status: 'online' })
    startCronJobs();
    registerAllSlashCommands(client);
});

const dev = process.env.NODE_ENV !== 'production'
const app = Next({
    dev,
    dir: './seabot_web'
});
const handle = app.getRequestHandler()

import fs from 'fs';
import https from 'https';
app.prepare().then(() => {
    const webApp = express();
    webApp.get(API.Endpoints.DISCORD_AUTH, discordAuth)
    webApp.get(API.Endpoints.HUE_AUTH, hueInit);
    webApp.all('*', (req, res) => {
        return handle(req, res);
    });
    if(Environment.DEBUG) {
        console.log('local dev')
        // ignore self signed cert for local dev
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        https.createServer({
            key: fs.readFileSync('./rootCA.key'),
            cert: fs.readFileSync('./rootCA.pem'),
            passphrase: 'localdev'
        }, webApp).listen(8080);
    }
    else {
        console.log('prod')
        webApp.listen(8080);
    }
});

