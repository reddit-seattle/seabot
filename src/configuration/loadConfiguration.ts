import { promises as fs } from "fs";

import defaultConfig from "./defaultConfig";
import ISeabotConfig from "./ISeabotConfig";

import { Duration } from "../utils/Time/Duration";

export default async function loadConfiguration(
  path: string
): Promise<ISeabotConfig> {
  path = `${path}\\seabotConfig.json`;
  console.log(`Loading configuration file from "${path}"...`);
  let configuration = null;

  try {
    await fs.access(`${path}`);
    configuration = JSON.parse(
      (await fs.readFile(path)).toString()
    ) as ISeabotConfig;
    if (configuration.autoDeleteMessages) {
      configuration.autoDeleteMessages.channels.forEach((channel) => {
        if (channel.timeBeforeClearing) {
          channel.timeBeforeClearing = new Duration(channel.timeBeforeClearing);
        }
      });
    }
  } catch (error) {
    /*
     * This will only catch instances where the configuration file is not valid JSON or not present.
     * When the configuration file schema is in a more final state, a full type guard should be established
     * to validate the loaded configuration file.
     */
    console.warn(
      "Configuration file not found, or is malformed. Continuing with default configuration..."
    );
    configuration = defaultConfig;
  }

  return configuration;
}
