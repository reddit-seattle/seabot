import { Config, Environment } from './utils/constants';
import { Command } from './models/Command';
import { schedule } from 'node-cron';
import { Client, TextChannel } from 'discord.js'
import { each } from 'underscore';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { MTGCommand } from './commands/mtgCommands';
import { ForecastCommand, WeatherCommand } from './commands/weatherCommands';
import { coffeeCommand, pingCommand, teaCommand, valheimServerCommand } from './commands/utilCommands';
import { clearChannel, deleteMessages } from './commands/rantChannelCommands';
import { abeLeaves, newAccountJoins } from './commands/joinLeaveCommands';
import { Help } from './commands/helpCommands';
import { handleVoiceStatusUpdate } from './functions/voiceChannelManagement';
import { GetMessageArgs } from './utils/helpers';

const client: Client = new Client();

// TODO: common command loader
const commands = [
    MTGCommand,
    WeatherCommand,
    ForecastCommand,
    teaCommand,
    coffeeCommand,
    valheimServerCommand,
    pingCommand,
    Help
].reduce((map, obj) => {
    map[obj.name] = obj;
    return map;
}, {} as { [id: string]: Command });


const { botToken } = Environment;

//MAIN

//check for bot token
if (!botToken || botToken == '') {
    console.log(`env var "botToken" missing`);
}
else {
    //login and go
    client.login(botToken);
}

//handle voice connections
client.on('voiceStateUpdate', handleVoiceStatusUpdate);

//join/leave
client.on('guildMemberRemove', abeLeaves);
client.on('guildMemberAdd', newAccountJoins);

//handle messages
client.on('message', async (message) => {
    if (message.channel instanceof TextChannel && message?.channel?.name == 'rant') {
        deleteMessages(message);
        return;
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


    //send it
    const args = GetMessageArgs(message);
    const command = commands?.[args?.[0]]

    try {
        command?.execute(message, args)
    }
    catch (e: any) {
        console.dir(e);
        message.react('💩');
    }

});

//log errors to the console because i don't have anywhere better to store them for now
client.on('error', console.error);

const startCronJobs = () => {
    schedule('*/5 * * * *', () => {
        clearChannel(client);
    })
}

const DEBUG = false;
client.on('ready', async () => {
    if (DEBUG) {
        //try to announce to servers when you go online
        each(client.guilds.cache.array(), (guild) => {
            const debugChannel = guild.channels.cache.find(ch => ch.name == 'debug') as TextChannel;
            debugChannel && debugChannel.send("SEAbot online!");
        });
    }
    console.log('connected to servers:');
    each(client.guilds.cache.array(), (guild) => {
        console.log(guild.name);
    });

    client.user?.setPresence({ activity: { name: 'bot stuff' }, status: 'online' })
    startCronJobs();
});

//stupid fix for azure app service containers requiring a response to port 8080
var http = require('http');
http.createServer(function (req: Http2ServerRequest, res: Http2ServerResponse) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('yeet');
    res.end();
}).listen(8080);
