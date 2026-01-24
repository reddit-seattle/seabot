import { Events, ModalSubmitInteraction } from "discord.js";
import DiscordEventRouter from "../discord/DiscordEventRouter";
import {
  BET_MODAL_PREFIX,
  handleBetModalSubmit,
} from "./BetModal";

type ModalHandler = (interaction: ModalSubmitInteraction) => Promise<any>;

// TODO: optimize handler lookup
const modalHandlers: Map<string, ModalHandler> = new Map([
  [BET_MODAL_PREFIX, handleBetModalSubmit],
]);

export function registerModalHandlers(eventRouter: DiscordEventRouter) {
  eventRouter.addEventListener(
    Events.InteractionCreate,
    async (interaction: any) => {
      if (interaction.isModalSubmit()) {
        for (const [prefix, handler] of modalHandlers) {
          if (interaction.customId.startsWith(prefix)) {
            await handler(interaction);
            return;
          }
        }
        console.warn(`No handler found for modal: ${interaction.customId}`);
      }
    },
  );
}
