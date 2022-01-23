import { NextApiRequest, NextApiResponse } from 'next';
import { TextChannel } from 'discord.js'
import { ClientHandler } from '../../apiUtils/clientHandler';
import { getSession } from 'next-auth/react';



const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession({ req });
    
    if (session) {
        const client = await ClientHandler.getClient();
        const data = JSON.parse(req.body) as {selectedChannel: string, message: string};
        const channel = client?.channels.cache.get(data.selectedChannel) as TextChannel;
        const messageResult = await channel.send(data.message);
        res.status(200).json(JSON.stringify({messageResult}));
        res.end();
    }
    else{
        res.status(401).end('unauthorized');
    }
}

export default handler;