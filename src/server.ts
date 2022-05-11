import { Client, TextChannel } from 'discord.js'
import { REST } from '@discordjs/rest';
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9';
import express from 'express';
import { schedule } from 'node-cron';

import { ChannelIds, Database, Environment } from './utils/constants';
import { CommandDictionary, ReactionCommandDictionary } from './models/Command';
 import { MTGCommand } from './commands/mtgCommands';
import { AirQualityCommand, ForecastCommand, WeatherCommand } from './commands/weatherCommands';
import { coffeeCommand, pingCommand, teaCommand, valheimServerCommand, botInfoCommand, sarcasmText, whoopsCommand, SourceCommand } from './commands/utilCommands';
import { clearChannel, deleteMessages } from './commands/rantChannelCommands';
import { abeLeaves, newAccountJoins } from './commands/joinLeaveCommands';
import { Help, ReactionHelp } from './commands/helpCommands';
import { handleVoiceStatusUpdate } from './functions/voiceChannelManagement';
import { SetHueTokens } from './utils/helpers';
import { HueEnable, HueInit, HueSet } from './commands/hueCommands';
import { RJSays } from './commands/rjCommands';
import { googleReact, lmgtfyReact } from './commands/reactionCommands';
import { exit } from 'process';
import { CosmosClient } from '@azure/cosmos';
import DBConnector from './db/DBConnector';
import { Config, Incident } from './models/DBModels';
import { ChanclaCommand, IncidentCommand, ShowChanclasCommand } from './commands/databaseCommands';
import { processMessageReactions } from './utils/reaccs';

const client = new Client({
  intents: [
    "GUILDS",
    "GUILD_MESSAGES",
    "GUILD_VOICE_STATES",
    "GUILD_MEMBERS",
    "GUILD_MESSAGE_REACTIONS",
  ],
});

// database
const cosmosClient = new CosmosClient({
    endpoint: Environment.cosmosHost,
    key: Environment.cosmosAuthKey
});

const incidentConnector = new DBConnector<Incident>(cosmosClient, Database.DATABASE_ID, Database.Containers.INCIDENTS);
incidentConnector.init()
.catch(err => {
    console.error(err)
    console.error(
        'There was an error connecting to the incident container.'
        )
    });
const configConnector = new DBConnector<Config>(cosmosClient, Database.DATABASE_ID, Database.Containers.CONFIGS);
configConnector.init()
.catch(err => {
    console.error(err)
    console.error(
      'There was an error connecting to the incident container.'
    )
});

//#region commands

// TODO: common command loader
const commands: CommandDictionary = [
    MTGCommand,
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
    SourceCommand,
    new IncidentCommand(incidentConnector),
    new ShowChanclasCommand(configConnector)
].reduce((map, obj) => {
    map[obj.name.toLowerCase()] = obj;
    return map;
}, {} as CommandDictionary);


const reactionCommands: ReactionCommandDictionary = [
    googleReact,
    lmgtfyReact,
    new ChanclaCommand(configConnector)
].reduce((map, obj) => {
    map[obj.emojiId.toLowerCase()] = obj;
    return map;
}, {} as ReactionCommandDictionary);
//#endregion
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

// #region interaction handling
//handle messages
client.on('messageCreate', async (message) => {

    //bad bot
    if (message.author.bot) return;

    const { channel, content } = message;
    
    if (channel instanceof TextChannel && channel?.id == ChannelIds.RANT) {
        deleteMessages(message);
    }
    if (message.content === 'SEA') {
        channel.send('HAWKS!')
        return;
    }
    if (content.toLowerCase().includes('tbf') || content.toLowerCase().includes('to be fair')) {
        // we use tbf more than we should, tbf
        if (Math.random() >= 0.75) {
            channel.send('https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631');
        }
    }

    await processMessageReactions(message);

});

client.on('messageReactionAdd', async (reaction) => {
    const {message, emoji} = reaction;
    console.dir(emoji);
    const alreadyReacted = (reaction.count && reaction.count > 1) == true;
    // this prevents the same reaction command from firing multiple times
    if(message.author?.bot || !emoji.id) {
        return;
    }
    try{
        const command = reactionCommands?.[emoji.id];
        if(!command || (command?.limit && alreadyReacted)) {
            return;
        }
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

client.on("interactionCreate", async interaction => {
    if(!interaction.isCommand()) return;

    const command = commands?.[interaction.commandName];
    if(command) {
        command.executeSlashCommand?.(interaction);
    };
})

//handle voice connections
client.on('voiceStateUpdate', handleVoiceStatusUpdate);
//join/leave
client.on('guildMemberRemove', abeLeaves);
client.on('guildMemberAdd', newAccountJoins);
// #endregion

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
                const desc = command.slashCommandDescription();
                slashCommands.push(desc.toJSON());
            }
        }
        const result = await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guild.id),
            {
                body: slashCommands
            }
        );
        console.dir(result);
        // TODO: sort out slash command permissions
        // result.forEach(async res => {
            //if nobody can access this
            // if(!res.default_permission)
            // {
            //   //at least let mods access it
            //   const permissions: ApplicationCommandPermissionData[] = [...SlashCommandRoleConfigs.MOD_ONLY];
            //   // get the command by id
            //   const cmd = await guild.commands.fetch(res.id);
            //   // add our special perms
            //   const permResult = await cmd?.permissions.set({ permissions });
            //   if (permResult) {
            //     console.log(
            //       "Gave MOD access to the following command: " + res.name
            //     );
            //     console.dir(permResult);
            //   }
            // }
        // });
        

    });
}

client.on('ready', async () => {
    console.log('connected to servers:');
    client.guilds.cache.forEach(guild => {
        console.log(guild.name);
    });
    client.user?.setPresence({ activities: [{ name: 'bot stuff' }], status: 'online' })
    startCronJobs();
    registerAllSlashCommands(client);
});

// #region express routes
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
// #endregion
