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

    // Create modal components
    const daysInput = new TextInputBuilder()
      .setCustomId("days")
      .setLabel("within X days")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("7")
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(4);

    const noteInput = new TextInputBuilder()
      .setCustomId("note")
      .setLabel("note")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Care to explain?")
      .setRequired(false)
      .setMaxLength(BettingConstants.MAX_NOTE_LENGTH);

    const daysRow = new ActionRowBuilder().addComponents(daysInput);
    const noteRow = new ActionRowBuilder().addComponents(noteInput);

    // Create modal
    const modal = new ModalBuilder()
      .setCustomId(`betban_modal_${targetUser.id}`)
      .setTitle(`Bet: ${targetUser.tag} will be banned`)
      .addActionRows(daysRow, noteRow);

    await interaction.showModal(modal);
  },
  builder: new UserContextCommandBuilder(),
});
