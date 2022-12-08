import express from "express";

import { Environment } from "./utils/constants";
import { SetHueTokens } from "./utils/helpers";

export default class ExpressServer {
    private _server;

    constructor() {
        this._server = express();

        // A response on the root is required by Azure Web Apps at port 8080 to monitor container health.
        this._server.get("/", (request, response) => {
            response.send("Discord bot active.");
        });

        // hue auth flow configuration
        this._server.get("/seabot_hue", async (request, response) => {
            try {
                const { code, state } = request?.query;
                if (!state || state != Environment.hueState) {
                    throw new Error("Invalid state value");
                }
                const result = await SetHueTokens(code as string);
                if (result?.success) {
                    response.writeHead(200, { "Content-Type": "text/plain" });
                    response.write(`Successfully set Hue access and refresh tokens!`);
                    response.end();
                } else {
                    throw new Error(result.error);
                }
            } catch (e: any) {
                response.writeHead(400, { "Content-Type": "text/plain" });
                response.write(`
                    Something (bad) happened trying to get auth code / set tokens:</br>
                    ${JSON.stringify(e)}`);
                response.end();
            }
        });
    }

    start() {
        console.log("Starting express server...");
        this._server.listen(8080);
    }
}
