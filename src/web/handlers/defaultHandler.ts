import { Request, Response } from "express";

export const DefaultHandler = (req: Request, res: Response) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('nothing to see here');
    res.end();
}