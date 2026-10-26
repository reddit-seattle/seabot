import { configuration } from "../../../server";
import { Environment } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { createAiCheckFeature } from "../../../aiDetection/createAiCheckFeature";

const feature = createAiCheckFeature(() => ({
  config: configuration?.aiDetection,
  channelId: configuration?.channelIds?.SUBREDDIT_CHAT,
  roleId: configuration?.roleIds?.subredditModerator,
  apiKey: Environment.pangramApiKey,
}), {
  log: outcome => {
    if (outcome === "success") Logger.info("AI detection completed.");
    else Logger.warn("AI detection outcome:", outcome);
  },
});

export const processAiCheckInteractions = feature.handleInteraction;
export default feature.commands;
