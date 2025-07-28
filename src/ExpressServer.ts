import express from "express";

export default class ExpressServer {
  private _server;

  constructor() {
    this._server = express();

    // A response on the root is required by Azure Web Apps at port 8080 to monitor container health.
    this._server.get("/", (request, response) => {
      response.send("Discord bot active.");
    });
  }

  start() {
    console.log("Starting express server...");
    this._server.listen(8080);
  }
}
