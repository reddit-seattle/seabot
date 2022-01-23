import { NextApiRequest, NextApiResponse } from "next";
import { GuildIds } from "../../../src/utils/constants";
import { getSession } from "next-auth/react";
import { ClientHandler } from "../../apiUtils/clientHandler";
const guildId = GuildIds.Seattle;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession({ req });

  if (session) {
    const client = await ClientHandler.getClient();
    const channels = await (
      await (await client?.guilds.fetch(guildId))?.channels.fetch()
    )?.filter((chan) => {
      return chan.parent != null;
    });
    res.status(200).json(JSON.stringify(channels));
    res.end();
  } else {
    res.status(401);
    res.end();
  }
};

export default handler;