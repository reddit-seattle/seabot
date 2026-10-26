import type { Interaction } from "discord.js";
import SlashCommand from "../commands/slash/SlashCommand";
import { respondPrivateError } from "../discord/privateErrors";
import { AiCheckService } from "./AiCheckService";
import { AiCheckInteractions, aiCheckBuilder } from "./interactions";
import { PangramProvider } from "./PangramProvider";
import { AiCheckError, AiDetectionConfig, AiDetectionProvider, Fetch } from "./types";

export interface AiCheckSettings {
  config?: AiDetectionConfig;
  channelId?: string;
  roleId?: string;
  apiKey?: string;
}

/** No server import or startup side effects; dependencies are supplied by composition. */
export function createAiCheckFeature(
  settings: () => AiCheckSettings,
  dependencies: {
    fetcher?: Fetch;
    provider?: (config: AiDetectionConfig, apiKey: string) => AiDetectionProvider;
    log?: (outcome: string) => void;
  } = {},
) {
  let handlers: AiCheckInteractions | undefined;
  let service: AiCheckService | undefined;

  function feature(): AiCheckInteractions {
    const { config, channelId, roleId, apiKey } = settings();
    const snowflake = (s: string | undefined) => !!s && /^\d{17,20}$/.test(s);
    if (!config?.enabled || config.provider !== "pangram" || !apiKey ||
        !snowflake(config.guildId) || !snowflake(channelId) || !snowflake(roleId) ||
        !config.model?.trim() || !Number.isFinite(config.usdPer100Words) || config.usdPer100Words <= 0) {
      throw new AiCheckError("disabled", "AI detection is not configured or is disabled. Contact a bot administrator.");
    }
    if (!handlers) {
      const provider = dependencies.provider?.(config, apiKey) ??
        new PangramProvider(apiKey, config.model, config.usdPer100Words, dependencies.fetcher);
      service = new AiCheckService(provider, Date.now, dependencies.log);
      handlers = new AiCheckInteractions(service, { guildId: config.guildId, channelId: channelId!, roleId: roleId! }, dependencies.fetcher);
    }
    return handlers;
  }

  const commands = [new SlashCommand({
    name: "ai-check",
    description: "Check Reddit text for AI-generated content with a private report",
    help: "ai-check [file: UTF-8 .txt] — #subreddit-chat/threads or Subreddit Mod",
    privateErrors: true,
    telemetry: false,
    builder: aiCheckBuilder(),
    // The existing slash router owns the private error boundary.
    execute: async interaction => feature().execute(interaction),
  })];

  return {
    commands,
    async handleInteraction(interaction: Interaction): Promise<void> {
      if ((!interaction.isButton() && !interaction.isModalSubmit()) || !interaction.customId.startsWith("ai-check:")) return;
      try { await feature().handle(interaction); }
      catch (error) { await respondPrivateError(interaction, error); }
    },
    dispose() { service?.dispose(); handlers = undefined; service = undefined; },
  };
}
