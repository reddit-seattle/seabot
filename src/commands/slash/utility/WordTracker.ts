import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  ChatInputCommandInteraction,
  GuildMemberRoleManager,
  MessageFlags,
} from "discord.js";

import { wordTrackerStore } from "../../../db";
import { configuration } from "../../../server";
import SlashCommand from "../SlashCommand";

const enum WORDTRACKER_COMMAND_TYPES {
  LIST_COMMAND = "list",
  REMOVE_COMMAND = "remove",
}

export default new SlashCommand({
  name: "word-tracker",
  description: "Manages trigger word tracking",
  help: "word-tracker",
  builder: new ChatInputCommandBuilder()
    .setName("word-tracker")
    .setDescription("Manages word tracking")
    .addSubcommands([
      (cmd) =>
        cmd
          .setName(WORDTRACKER_COMMAND_TYPES.LIST_COMMAND)
          .setDescription("List all tracked words"),
      (cmd) =>
        cmd
          .setName(WORDTRACKER_COMMAND_TYPES.REMOVE_COMMAND)
          .setDescription("Remove a word from the tracker list")
          .addStringOptions([
            (option) =>
              option
                .setName("word")
                .setDescription("The word to remove")
                .setRequired(true),
          ]),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const cmd = interaction.options.getSubcommand(true);

    const telemetryDb = wordTrackerStore;

    if (cmd === WORDTRACKER_COMMAND_TYPES.LIST_COMMAND) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const trackers = telemetryDb.getAllWordTrackers();
      if (!trackers?.length) {
        interaction.followUp({
          content: "No words are being tracked yet.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const trackerList = trackers
        .map((tracker: any) => {
          const daysSince = Math.floor(
            (Date.now() - new Date(tracker.last_seen).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return `- **${tracker.word}**: ${daysSince} days ago (${tracker.word_count} total mentions)`;
        })
        .join("\n");

      interaction.followUp({
        content: `**Tracked Words:**\n${trackerList}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (cmd === WORDTRACKER_COMMAND_TYPES.REMOVE_COMMAND) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { member } = interaction;
      if (
        !(member?.roles as GuildMemberRoleManager).cache.has(
          configuration.roleIds.moderator,
        )
      ) {
        await interaction.editReply({
          content: "bad. naughty. shame",
        });
        return;
      }

      const word = interaction.options.getString("word", true).toLowerCase();
      const existingTracker = telemetryDb.getWordTracker(word);

      if (!existingTracker) {
        interaction.followUp({
          content: `No tracker found for "${word}".`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      telemetryDb.resetWordTracker(word);

      interaction.followUp({
        content: `Removed tracker for "${word}".`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
  adminOnly: false,
});
