import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  UserContextCommandBuilder,
} from "@discordjs/builders";
import {
  MessageFlags,
  TextInputStyle,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { BettingConstants } from "../../utils/constants";
import { validateBet } from "../slash/betting/BetValidation";
import ContextMenuCommand from "./ContextMenuCommand";

export default new ContextMenuCommand({
  name: "ban betting",
  description: "Bet on whether this user will be banned",
  adminOnly: true,
  execute: async (interaction: UserContextMenuCommandInteraction) => {
    const targetUser = interaction.targetUser;

    // Validate bet placement
    const validation = await validateBet(interaction, targetUser.id);
    if (!validation.valid) {
      return interaction.reply({
        content: validation.errorMessage!,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({flags: MessageFlags.Ephemeral, content: "Bet placed."});
  },
  builder: new UserContextCommandBuilder(),
});
