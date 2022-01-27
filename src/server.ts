import { Client, TextChannel } from 'discord.js'
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9';
import express from 'express';
import { schedule } from 'node-cron';

import { ChannelIds, Config, Environment, RoleIds } from './utils/constants';
import { CommandDictionary, ReactionCommandDictionary } from './models/Command';
// import { MTGCommand } from './commands/mtgCommands';
import { AirQualityCommand, ForecastCommand, WeatherCommand } from './commands/weatherCommands';
import { coffeeCommand, pingCommand, teaCommand, valheimServerCommand, botInfoCommand, sarcasmText, whoopsCommand } from './commands/utilCommands';
import { clearChannel, deleteMessages } from './commands/rantChannelCommands';
import { abeLeaves, newAccountJoins } from './commands/joinLeaveCommands';
import { Help, ReactionHelp } from './commands/helpCommands';
import { handleVoiceStatusUpdate } from './functions/voiceChannelManagement';
import { SplitMessageIntoArgs, SetHueTokens } from './utils/helpers';
import { HueEnable, HueInit, HueSet } from './commands/hueCommands';
import { RJSays } from './commands/rjCommands';
import { googleReact, lmgtfyReact } from './commands/reactionCommands';
import { exit } from 'process';

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
    sarcasmText,
    whoopsCommand,
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
    const alreadyReacted = (reaction.count && reaction.count > 1) == true;
    // this prevents the same reaction command from firing multiple times
    if(message.author?.bot || !emoji.id || alreadyReacted) {
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
                console.log(`adding ${command.name} slash command registration`)
               slashCommands.push(command.slashCommandDescription().toJSON())
            }
        }
        console.log('all commands: ')
        console.dir(slashCommands);
        const result = await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guild.id),
            {
                body: slashCommands
            }
        )
        console.dir(result);

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

//stupid fix for azure app service containers requiring a response to port 8080
const webApp = express();
webApp.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('nothing to see here');
    res.end();
});
// hue auth flow configuration
webApp.get('/seabot_hue', async (req, res) => {
    try{
        const { code, state } = req?.query;
        if(!state || state != Environment.hueState){
            throw new Error('Invalid state value');
        }
        const result = await SetHueTokens(code as string);
        if(result?.success) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write(`Successfully set Hue access and refresh tokens!`);
            res.end();
        }
        else {
            throw new Error(result.error);
        }
    }
    catch(e: any) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write(`
            Something (bad) happened trying to get auth code / set tokens:</br>
            ${JSON.stringify(e)}`
        );
        res.end();
    }
});

webApp.listen(8080);

