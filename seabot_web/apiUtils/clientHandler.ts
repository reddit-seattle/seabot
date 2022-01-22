import {  Client } from "discord.js";
import { Environment } from "../../src/utils/constants";

export module ClientHandler {
  const client: Client = new Client({
    intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MEMBERS"],
  });
  client.login(Environment.botToken);
  export async function getClient() {
    const ready = await initialize();
    return ready ? client : null;
  }
  const initialize = async () => {
    console.log("initializing client for api surface");
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        // resolve if we're already ready
        if (client.isReady()) {
          resolve(true);
        }
        let attempts = 0;
        while (!client?.isReady() && attempts++ < 5) {
          await delay(1000);
          if (client.isReady()) {
            resolve(true);
          }
        }
        reject("Client failed to initialize");
      } catch (error: any) {
        reject(error);
      }
    });
  };
  const delay = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
}
