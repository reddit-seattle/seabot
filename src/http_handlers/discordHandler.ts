import { Request, Response } from "express";

export const discordAuth = async (req: Request, res: Response) => {
    const { code, guild_id } = req?.query;
}