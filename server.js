const config = require('dotenv').config();

const Discord = require('discord.js');
const _ = require('underscore');
const weatherModule = require('./functions/weather');
const constants = require('./utils/constants');
const mtgModule = require('./functions/mtg');
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


client.on('message', (message) => {
    const commandPart = message.content.split(' ')[0];
    if(commandPart && commandPart.startsWith(prefix)) {
        const command = commandPart.split(prefix)[1];
        COMMANDS[command] && tryCommand(COMMANDS[command](message));
    }
    else if(message.content === 'SEA') {
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
    catch(err) {console.log(err);}
}

//log errors to the console because i don't have anywhere better to store them for now
client.on('error', console.error);

const DEBUG = false;
client.on('ready', async () => {
    if (DEBUG) {
        //try to announce to servers when you go online
        _.each(client.guilds.array(), (guild) => {
            const debugChannel = guild.channels.find(ch => ch.name == 'debug');
            debugChannel && debugChannel.send("SEAbot online!");
        });
    }
});

//stupid fix for azure app service containers requiring a response to port 8080
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('yeet');
  res.end();
}).listen(8080);
