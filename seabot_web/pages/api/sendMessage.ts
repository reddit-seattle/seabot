import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Client, TextChannel } from 'discord.js'
import { Environment, GuildIds } from '../../../src/utils/constants';

const secret = Environment.JWT_SEED;
const guildId = '370945003566006272';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({req, secret});
    console.dir(req);
    console.dir(req.body);
    const data = JSON.parse(req.body) as {selectedChannel: string, message: string};
    console.dir(data);
    if(token) {
        console.dir('token found');
        const client = new Client({
            intents: [
                "GUILDS",
                "GUILD_MESSAGES",
                "GUILD_MEMBERS",
            ],
        });
        console.dir('client created');
        client.login(Environment.botToken);
        console.dir('client logged in');
        client.on('ready', async () => {
            // console.dir(guildId);
            console.dir(data);
            // const guild = client.guilds.fetch(guildId);
            // console.dir(guild);
            console.log('channelId')
            console.log(data.selectedChannel);
            const channel = client.channels.cache.get(data.selectedChannel) as TextChannel;
            console.log('channel')
            console.dir(channel);
            const messageResult = await channel.send(data.message);
            res.status(200).json(JSON.stringify({messageResult}));
            res.end();
            client.destroy();
        });
        
    }
    else{
        res.status(401).end('unauthorized');
    }
}

export default handler;