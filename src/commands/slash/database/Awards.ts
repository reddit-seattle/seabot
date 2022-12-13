import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";

import { Award as AwardModel } from "../../../models/DBModels";
import { Database } from "../../../utils/constants";
import { DatabaseCommand } from "./DatabaseCommand";

enum SubCommands {
  GIVE = "give",
  LIST = "list",
}

const config = {
  name: "award",
  description: "Give and list awards",
  help: "award user message | award user list",
  adminOnly: true,
  builder: new SlashCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((cmd) => {
      return cmd
        .setName(SubCommands.GIVE)
        .setDescription("give another user an award")
        .addUserOption((option) => {
          return option
            .setName("user")
            .setDescription("who are you awarding")
            .setRequired(true);
        })
        .addStringOption((option) => {
          return option
            .setName("message")
            .setDescription("let them know what they did to deserve it!")
            .setRequired(false);
        });
    })
    .addSubcommand((cmd) => {
      return cmd
        .setName(SubCommands.LIST)
        .setDescription("show your awards (or another user's)")
        .addUserOption((option) => {
          return option
            .setName("user")
            .setDescription("who are you awarding")
            .setRequired(false);
        });
    }),
  execute: handler,
};

export default new DatabaseCommand<AwardModel>(
  Database.Containers.AWARDS,
  config
);

async function handler(
  this: DatabaseCommand<AwardModel>,
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply({ ephemeral: true });
  const cmd = interaction.options.getSubcommand(true);
  if (cmd === SubCommands.GIVE) {
    const user = interaction.options.getUser("user", true);
    if (user.id == interaction.user.id) {
      await interaction.followUp({
        content: "Try giving someone else an award, maybe?",
        ephemeral: true,
      });
      return;
    }
    const message = interaction.options.getString("message", false);
    const award: AwardModel = {
      awardedBy: interaction.user.id,
      awardedTo: user.id,
      awardedOn: new Date(),
      message: message ?? undefined,
    };
    const result = await this.connector.addItem(award);
    if (result?.id) {
      await interaction.followUp({
        content: "Award granted!",
        ephemeral: true,
      });
    }
    interaction.guild?.systemChannel?.send(
      `${user.username} has been given an award!`
    );
  } else if (cmd === SubCommands.LIST) {
    const user = interaction.options.getUser("user", false);
    const records = await this.connector.find(
      Database.Queries.AWARDS_BY_USER(user ? user.id : interaction.user.id)
    );
    if (records?.[0]) {
      const embed = new EmbedBuilder({
        title: `Awards for ${user?.username || interaction.user.username}`,
        description: `${records.length} award${records.length > 1 ? "s" : ""}:`,
        fields: records.map((award: any, i: number) => {
          return {
            name: `${i + 1}: ${award.message || "No message"}`,
            value: award.awardedOn.toString(),
          };
        }),
      });
      await interaction.followUp({ embeds: [embed] });
    } else {
      await interaction.followUp({
        content: "No awards found",
        ephemeral: true,
      });
    }
  }
}
