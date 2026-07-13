import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import SlashCommand from "../SlashCommand";
import { aimStore } from "../../../db/AimStore";
import { AimApi } from "../../../utils/aim/AimApi";
import { Logger } from "../../../utils/logger";
import { banAimUser, postAudit } from "./shared";

enum AimAdminSubCommands {
  BAN = "ban",
  UNBAN = "unban",
  KICK = "kick",
  LOOKUP = "lookup",
}

export default new SlashCommand({
  name: "aim-admin",
  description: "moderate the AIM server",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("aim-admin")
    .setDescription("moderate the AIM server")
    .setDefaultMemberPermissions(0)
    .addSubcommands([
      (cmd) =>
        cmd
          .setName(AimAdminSubCommands.BAN)
          .setDescription("ban a user from AIM (suspend + kick + blocklist)")
          .addUserOptions([
            (opt) =>
              opt.setName("user").setDescription("who").setRequired(true),
          ])
          .addStringOptions([
            (opt) =>
              opt.setName("reason").setDescription("why").setRequired(false),
          ]),
      (cmd) =>
        cmd
          .setName(AimAdminSubCommands.UNBAN)
          .setDescription("lift an AIM ban")
          .addUserOptions([
            (opt) =>
              opt.setName("user").setDescription("who").setRequired(true),
          ]),
      (cmd) =>
        cmd
          .setName(AimAdminSubCommands.KICK)
          .setDescription("kick a live AIM session (account intact)")
          .addUserOptions([
            (opt) =>
              opt.setName("user").setDescription("who").setRequired(true),
          ]),
      (cmd) =>
        cmd
          .setName(AimAdminSubCommands.LOOKUP)
          .setDescription("look up discord user <-> screen name")
          .addUserOptions([
            (opt) =>
              opt
                .setName("user")
                .setDescription("discord user")
                .setRequired(false),
          ])
          .addStringOptions([
            (opt) =>
              opt
                .setName("screenname")
                .setDescription("AIM screen name")
                .setRequired(false),
          ]),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcmd = interaction.options.getSubcommand();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const actor = interaction.user.username;

    try {
      switch (subcmd) {
        case AimAdminSubCommands.BAN: {
          const target = interaction.options.getUser("user", true);
          const reason = interaction.options.getString("reason", false);
          const screenName = await banAimUser(
            interaction.client,
            target.id,
            actor,
            reason,
          );
          await interaction.followUp(
            screenName
              ? `Banned <@${target.id}> — \`${screenName}\` suspended and kicked.`
              : `<@${target.id}> has no active AIM account — nothing to suspend.`,
          );
          return;
        }

        case AimAdminSubCommands.UNBAN: {
          const target = interaction.options.getUser("user", true);
          const link = aimStore.getLinkByDiscordId(target.id);
          if (link?.status !== "banned") {
            await interaction.followUp(`<@${target.id}> isn't AIM-banned.`);
            return;
          }
          await AimApi.setSuspendedStatus(link.screen_name, false);
          aimStore.setLinkStatus(target.id, "active");
          await postAudit(
            interaction.client,
            `**AIM unban** — <@${target.id}> by ${actor}`,
          );
          await interaction.followUp(`Unbanned <@${target.id}>.`);
          return;
        }

        case AimAdminSubCommands.KICK: {
          const target = interaction.options.getUser("user", true);
          const link = aimStore.getLinkByDiscordId(target.id);
          if (!link || link.status !== "active") {
            await interaction.followUp(
              `<@${target.id}> has no active AIM account.`,
            );
            return;
          }
          await AimApi.kickSessions(link.screen_name);
          await postAudit(
            interaction.client,
            `**AIM kick** — \`${link.screen_name}\` by ${actor}`,
          );
          await interaction.followUp(`Kicked \`${link.screen_name}\`.`);
          return;
        }

        case AimAdminSubCommands.LOOKUP: {
          const target = interaction.options.getUser("user", false);
          const screenName = interaction.options.getString("screenname", false);
          const link = target
            ? aimStore.getLinkByDiscordId(target.id)
            : screenName
              ? aimStore.getLinkByScreenName(screenName)
              : null;
          if (!link) {
            await interaction.followUp(
              "No link found (give a user or a screenname).",
            );
            return;
          }
          await interaction.followUp(
            [
              `**Discord:** <@${link.discord_id}> (\`${link.discord_username}\`)`,
              `**Screen name:** \`${link.screen_name}\``,
              `**Status:** ${link.status}`,
              `**Registered:** ${link.created_at}`,
            ].join("\n"),
          );
          return;
        }

        default:
          await interaction.followUp("Unknown subcommand.");
      }
    } catch (e) {
      Logger.error(`/aim-admin ${subcmd} failed:`, e);
      await interaction.followUp(
        "AIM management API call failed — check logs.",
      );
    }
  },
});
