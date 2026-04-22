import { promises as fs } from "fs";
import * as Path from "path";
import { Logger } from "../utils/logger";
import defaultConfig from "./defaultConfig";
import ISeabotConfig from "./ISeabotConfig";

import { Duration } from "../utils/Time/Duration";

export default async function loadConfiguration(
  path: string,
): Promise<ISeabotConfig> {
  path = Path.join(path, `seabotConfig.json`);
  Logger.info(`Loading configuration file from "${path}"...`);
  let configuration = null;

  try {
    await fs.access(`${path}`);
    configuration = JSON.parse(
      (await fs.readFile(path)).toString(),
    ) as ISeabotConfig;
    Logger.info("Loaded Configuration:");
    Logger.dir(configuration);
    if (configuration.autoDeleteMessages) {
      const { channels } = configuration.autoDeleteMessages;
      for (const channel of channels) {
        if (channel.timeBeforeClearing) {
          channel.timeBeforeClearing = new Duration(channel.timeBeforeClearing);
        }
      }
    }
  } catch (error) {
    Logger.warn(
      "Configuration file not found or is malformed. Continuing with default configuration.",
    );
    Logger.error("Config load error:", error);
    configuration = defaultConfig;
  }

  return configuration;
}
