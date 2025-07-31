import express from "express";
import fs from "fs";
import path from "path";
import { formatUptime } from "./utils/helpers";

export default class ExpressServer {
  private _server;
  private _startTime: Date;

  constructor() {
    this._server = express();
    this._startTime = new Date();
    // TODO - make this a badass web page
    this._server.get("/", (_request, response) => {
      const uptime = process.uptime();
      const uptimeFormatted = formatUptime(uptime);
      
      // Try to get package.json
      let packageInfo: any = {};
      try {
        const packagePath = path.join(__dirname, "../package.json");
        if (fs.existsSync(packagePath)) {
          packageInfo = JSON.parse(fs.readFileSync(packagePath, "utf8"));
        }
      } catch (error) {
        console.log("Error reading package.json:", error);
      }

      const buildInfo = {
        name: packageInfo.name || "seabot",
        version: packageInfo.version || "unknown",
        description: packageInfo.description || "a bot. in SEA.",
        uptime: uptimeFormatted,
        startedAt: this._startTime.toISOString(),
        lastUpdated: new Date().toISOString(),
        status: "vibin"
      };

      response.json(buildInfo);
    });
  }

  start() {
    console.log("Starting express server...");
    this._server.listen(8080);
  }
}
