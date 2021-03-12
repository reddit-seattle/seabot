const config = require('dotenv').config();
const cron = require('node-cron');
const Discord = require('discord.js');
const _ = require('underscore');
const weatherModule = require('./functions/weather');
const constants = require('./utils/constants');
const mtgModule = require('./functions/mtg');
const voiceModule = require('./functions/voiceChannelManagement');
const deleto = require('./functions/deleto');
const client = new Discord.Client();
const prefix = constants.PREFIX;

const COMMANDS = {
    'ping': (message) => { send(message.channel, 'Pong!') },
    'coffee': (message) => { send(message.channel, '`HTTP ERR: 418 - I am a teapot`') },
    'tea': (message) => {
        send(message.channel, constants.teapot);
    },
    'forecast': weatherModule.forecast,
    'weather': weatherModule.weather,
    'mtg': mtgModule.mtg
};

const botToken = process.env['botToken'];

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
client.on('voiceStateUpdate', (oldState, newState) => {
    const groupName = 'user-voice-channels'

    if(DEBUG){
        console.dir(oldState);
        console.dir(newState);
    }
    // check for bot
    if (oldState.member.user.bot) return;

    // if user has joined the test channel, do the thing
    if (newState?.member?.voice?.channel?.name == 'Join to create channel') {
        voiceModule.createVoiceChannelForMember(newState);
    }
    // if user has left a channel (no newstate.voiceChannel), delete it if it's empty
    if (
        (
            //leaving voice (disconnect)
            !newState.member?.voice?.channel || // or
            //switching channel
            newState?.channelID != oldState?.channelID
        ) &&
        //and you're not leaving the initial join channel
        oldState?.channel?.name != 'Join to create channel' &&
        //and you ARE leaving a channel in the group
        oldState?.channel?.parent?.name == groupName
    ) {
        // THEN delete the old channel
        voiceModule.deleteEmptyMemberVoiceChannel(oldState)
    }
});

//handle messages
client.on('message', (message) => {
    if(message.channel.name == 'rant') {
        deleto.delete(message);
    }

    const commandPart = message.content.split(' ')[0];
    if (commandPart && commandPart.startsWith(prefix)) {
        const command = commandPart.split(prefix)[1];
        COMMANDS[command] && tryCommand(COMMANDS[command](message));
    }
    else if (message.content === 'SEA') {
        message.channel.send('HAWKS!')
    }
});

//in debug mode, don't write live stuff
const send = (channel, toSend) => {
    DEBUG ? console.log(toSend) : channel.send(toSend);
}
const tryCommand = (cmd) => {
    try {
        cmd && cmd();
    }
    catch (err) { console.log(err); }
}

//log errors to the console because i don't have anywhere better to store them for now
client.on('error', console.error);

const startCronJobs = () => {
    cron.schedule('*/5 * * * *', () => {
        deleto.deleteOldMessages(client);
    })
}

const DEBUG = false;
client.on('ready', async () => {
    if (DEBUG) {
        //try to announce to servers when you go online
        _.each(client.guilds.cache.array(), (guild) => {
            const debugChannel = guild.channels.cache.find(ch => ch.name == 'debug');
            debugChannel && debugChannel.send("SEAbot online!");
        });
    }
    console.log('connected to servers:');
    _.each(client.guilds.cache.array(), (guild) => {
        console.log(guild.name);
    });

    client.user.setPresence({activity: {name: 'doin bot stuff'}, status: 'online'})
    startCronJobs();
});

//stupid fix for azure app service containers requiring a response to port 8080
var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('yeet');
    res.end();
}).listen(8080);
