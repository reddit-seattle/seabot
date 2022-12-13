import { promises as fs } from "fs";
import * as Path from "path";
import defaultConfig from "./defaultConfig";
import ISeabotConfig from "./ISeabotConfig";

import { Duration } from "../utils/Time/Duration";

export default async function loadConfiguration(
  path: string
): Promise<ISeabotConfig> {
  path = Path.join(path, `seabotConfig.json`);
  console.log(`Loading configuration file from "${path}"...`);
  let configuration = null;

  try {
    await fs.access(`${path}`);
    configuration = JSON.parse(
      (await fs.readFile(path)).toString()
    ) as ISeabotConfig;
    console.log("Loaded Configuration:");
    console.dir(configuration);
    if (configuration.autoDeleteMessages) {
      const { channels } = configuration.autoDeleteMessages;
      for(const channel of channels) {
        if (channel.timeBeforeClearing) {
          channel.timeBeforeClearing = new Duration(channel.timeBeforeClearing);
        }
      };
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
