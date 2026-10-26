import type { Interaction } from "discord.js";
import SlashCommand from "../SlashCommand";
import { configuration } from "../../../server";
import { Environment } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { AiCheckService } from "../../../aiDetection/AiCheckService";
import { AiCheckInteractions, aiCheckBuilder } from "../../../aiDetection/interactions";
import { PangramProvider } from "../../../aiDetection/PangramProvider";
import { AiCheckError } from "../../../aiDetection/types";
import { respondPrivateError } from "../../../discord/privateErrors";

let handlers: AiCheckInteractions | undefined;

/** Lazy composition only; importing/registering the command never contacts a service. */
function feature(): AiCheckInteractions {
  const config = configuration?.aiDetection;
  const channelId = configuration?.channelIds?.SUBREDDIT_CHAT;
  const roleId = configuration?.roleIds?.subredditModerator;
  const snowflake = (s: string | undefined) => !!s && /^\d{17,20}$/.test(s);
  if (!config?.enabled || config.provider !== "pangram" || !Environment.pangramApiKey ||
      !snowflake(config.guildId) || !snowflake(channelId) || !snowflake(roleId) ||
      !config.model?.trim() || !Number.isFinite(config.usdPer100Words) || config.usdPer100Words <= 0) {
    throw new AiCheckError("disabled", "AI detection is not configured or is disabled. Contact a bot administrator.");
  }
  if (!handlers) {
    const provider = new PangramProvider(Environment.pangramApiKey, config.model, config.usdPer100Words);
    const service = new AiCheckService(provider, Date.now, outcome => {
      if (outcome === "success") Logger.info("AI detection completed.");
      else Logger.warn("AI detection outcome:", outcome);
    });
    handlers = new AiCheckInteractions(service, { guildId: config.guildId, channelId: channelId!, roleId: roleId! });
  }
  return handlers;
}

export async function processAiCheckInteractions(interaction: Interaction): Promise<void> {
  if ((!interaction.isButton() && !interaction.isModalSubmit()) || !interaction.customId.startsWith("ai-check:")) return;
  try { await feature().handle(interaction); }
  catch (error) { await respondPrivateError(interaction, error); }
}

export default [new SlashCommand({
  name: "ai-check",
  description: "Check Reddit text for AI-generated content with a private report",
  help: "ai-check [file: UTF-8 .txt] — #subreddit-chat/threads or Subreddit Mod; 50–5,000 words",
  privateErrors: true,
  telemetry: false,
  builder: aiCheckBuilder(),
  execute: async interaction => feature().execute(interaction),
})];
