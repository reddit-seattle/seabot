import { Request, Response } from "express";
import { Environment } from "../utils/constants";
import { SetHueTokens } from "../utils/helpers";

export const hueInit =  async (req: Request, res: Response) => {
    try{
        const { code, state } = req?.query;
        if(!state || state != Environment.hueState){
            throw new Error('Invalid state value');
        }
        const result = await SetHueTokens(code as string);
        if(result?.success) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.write(`Successfully set Hue access and refresh tokens!`);
            res.end();
        }
        else {
            throw new Error(result.error);
        }
    }
    catch(e: any) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write(`
            Something (bad) happened trying to get auth code / set tokens:</br>
            ${JSON.stringify(e)}`
        );
        res.end();
    }
}