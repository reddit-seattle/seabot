import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Client } from 'discord.js'
import { Environment, GuildIds } from '../../../src/utils/constants';

const secret = Environment.JWT_SEED;
const guildId = GuildIds.Seattle;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({req, secret});
    console.dir('channel handler');
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
        const channels: {channelId: string, channelName: string}[] = [];
        client.on('ready', async () => {
            const guild = client.guilds.cache.get(guildId);
            guild?.channels.cache.forEach(channel => {
                console.dir(channel);
                channels.push({channelId: channel.id, channelName: channel.name});
            });
            console.dir('channels');
            console.dir(channels);
            res.status(200).json(JSON.stringify(channels));
            res.end();
            client.destroy();
        });
        
    }
    else{
        res.status(401).end('unauthorized');
    }
}

export default handler;