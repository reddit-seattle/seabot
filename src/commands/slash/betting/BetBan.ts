import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";
import bettingStore from "../../../db/BettingStore";
import SlashCommand from "../SlashCommand";
import { handleBetPlacement } from "./BetHelpers";

const enum BETBAN_COMMAND_TYPES {
  BET = "bet",
  LEADERBOARD = "leaderboard",
  REPORTS = "reports",
}

export default new SlashCommand({
  name: "betban",
  description: "Bet on whether new users will be banned",
  adminOnly: true,
  builder: new ChatInputCommandBuilder().addSubcommands([
    // /betban bet <user> [note]
    (cmd) =>
      cmd
        .setName(BETBAN_COMMAND_TYPES.BET)
        .setDescription("Bet on whether a recently joined user will be banned")
        .addUserOptions([
          (option) =>
            option
              .setName("user")
              .setDescription("The user to bet on")
              .setRequired(true),
        ])
        .addStringOptions([
          (option) =>
            option
              .setName("note")
              .setDescription("Care to explain?")
              .setRequired(false),
        ]),
    // /betban leaderboard
    (cmd) =>
      cmd
        .setName(BETBAN_COMMAND_TYPES.LEADERBOARD)
        .setDescription("View the ban betting leaderboard"),
    // /betban reports
    (cmd) =>
      cmd
        .setName(BETBAN_COMMAND_TYPES.REPORTS)
        .setDescription("[MOD] View bets"),
  ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
      case BETBAN_COMMAND_TYPES.BET:
        return handleBet(interaction);
      case BETBAN_COMMAND_TYPES.LEADERBOARD:
        return handleLeaderboard(interaction);
      case BETBAN_COMMAND_TYPES.REPORTS:
        return handleReports(interaction);
    }
  },
});

async function handleBet(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user", true);
  const note = interaction.options.getString("note") ?? undefined;

  const response = await handleBetPlacement({
    interaction,
    targetUserId: targetUser.id,
    note,
  });

  return interaction.reply(response);
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const leaderboard = bettingStore.getLeaderboard(guildId, 10);

  if (leaderboard.length === 0) {
    return interaction.reply({
      content: "No one has earned any points yet!",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Build the leaderboard embed
  const embed = new EmbedBuilder()
    .setTitle("Ban Prediction Leaderboard")
    .setColor(Colors.Gold)
    .setTimestamp();

  const medals = ["🥇", "🥈", "🥉"];
  let description = "";
  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    const medal = medals[i] ?? `${i + 1}.`;
    description += `${medal} <@${entry.user_id}> - **${entry.points}** point${entry.points !== 1 ? "s" : ""}\n`;
  }

  embed.setDescription(description);

  // Add user's rank if they're not in top 10
  const userPoints = bettingStore.getPoints(interaction.user.id, guildId);
  const userInTop10 = leaderboard.some(
    (entry) => entry.user_id === interaction.user.id,
  );

  if (!userInTop10 && userPoints > 0) {
    embed.addFields({
      name: "Your Stats",
      value: `**${userPoints}** point${userPoints !== 1 ? "s" : ""}`,
    });
  }

  return interaction.reply({ embeds: [embed] });
}

async function handleReports(interaction: ChatInputCommandInteraction) {
  // Check permissions
  if (
    !interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)
  ) {
    return interaction.reply({
      content: "Adults only.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = interaction.guildId!;
  const topTargets = bettingStore.getUnbannedUsersWithMostBets(guildId, 10);

  if (topTargets.length === 0) {
    return interaction.reply({
      content: "No active bets found.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // Build the embed
  const description = topTargets
    .map(
      (target, i) =>
        `${i + 1}. <@${target.target_user_id}> - **${target.bet_count}** bet${target.bet_count !== 1 ? "s" : ""}`,
    )
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("Users with Most Active Bets")
    .setDescription(description)
    .setColor(Colors.Red)
    .setTimestamp();
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
