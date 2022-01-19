import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Client } from 'discord.js'
import { Environment, GuildIds } from '../../../src/utils/constants';
import { getSession } from "next-auth/react"
const guildId = GuildIds.Seattle;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    console.dir('channel handler');
    const session = await getSession({ req });

    if (session) {
        const client = new Client({
            intents: [
                "GUILDS",
                "GUILD_MESSAGES",
                "GUILD_MEMBERS",
            ],
        });
        client.login(Environment.botToken);
        client.on('ready', async () => {
            const channels =  await (await client.guilds.fetch(guildId))?.channels.fetch();
            console.dir(`sending ${channels.size} channels`);
            res.status(200).json(JSON.stringify(channels));
            res.end();
            client.destroy();
        });
        
    }
    else{
        res.status(401);
        res.end();
    }
}

export default handler;