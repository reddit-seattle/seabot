import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { Environment } from '../../../src/utils/constants';

const secret = Environment.JWT_SEED;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({req, secret});
    if(token) {
        const { accessToken } = token;
        const data = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        const me = await data.json();
        res.status(200).json(me);
        res.end();
    }
    else{
        res.status(401).end('unauthorized');
    }
}

export default handler;