import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import SlashCommand from "../SlashCommand";
import { aimStore } from "../../../db/AimStore";
import {
  AimApi,
  AimApiError,
  generateAimPassword,
  isReservedScreenName,
  isValidAimPassword,
  sanitizeScreenName,
} from "../../../utils/aim/AimApi";
import { Logger } from "../../../utils/logger";
import { aimConnectionInfo, postAudit } from "./shared";

enum AimSubCommands {
  REGISTER = "register",
  PASSWORD = "password",
  INFO = "info",
  UNREGISTER = "unregister",
  WHO = "who",
}

const PASSWORD_RULES = "6-16 characters, no spaces";
const REREGISTER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Point-in-time seed: server nickname, then global display name, then handle. */
function screenNameSeed(interaction: ChatInputCommandInteraction): string {
  const member = interaction.member;
  const nick =
    member instanceof GuildMember ? member.displayName : member?.nick;
  return nick ?? interaction.user.globalName ?? interaction.user.username;
}

/** Creates the account; returns true on success, false if taken or create fails */
async function tryCreate(name: string, password: string): Promise<boolean> {
  if (aimStore.isScreenNameTaken(name)) return false;
  try {
    await AimApi.createUser(name, password);
    return true;
  } catch (e) {
    if (e instanceof AimApiError && e.status === 409) return false;
    throw e;
  }
}

/**
 * Attempts to claim a screen name, appending numbers if necessary.
 * Returns the claimed name, or null if none could be claimed.
 */
async function claimScreenName(
  base: string,
  password: string,
  exact: boolean,
): Promise<string | null> {
  // Try the base name first
  if (await tryCreate(base, password)) return base;

  // If exact was requested (and didn't succeed), fail fast
  if (exact) return null;

  // Try appending numbers to the base name
  for (let i = 2; i < 100; i++) {
    const suffix = String(i);
    const candidate = base.slice(0, 16 - suffix.length).trim() + suffix;
    if (await tryCreate(candidate, password)) return candidate;
  }
  return null;
}

/** Valid password (user-provided or generated), or null if invalid. */
function resolvePassword(
  interaction: ChatInputCommandInteraction,
): { password: string; generated: boolean } | null {
  const custom = interaction.options.getString("password", false);
  if (custom === null) {
    return { password: generateAimPassword(), generated: true };
  }
  return isValidAimPassword(custom)
    ? { password: custom, generated: false }
    : null;
}

function credentialLines(screenName: string, password: string | null): string {
  return [
    `**Screen name:** \`${screenName}\``,
    password
      ? `**Password:** \`${password}\` — shown only here, save it now (\`/aim password\` rotates it anytime)`
      : "**Password:** the one you chose",
    "",
    aimConnectionInfo(),
  ].join("\n");
}

export default new SlashCommand({
  name: "aim",
  description: "your retro AIM account on ${aim.rseattle.org}",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("aim")
    .setDescription("your AIM account on aim.rseattle.org")
    // TEMP - requires manual admin role assignment for now
    .setDefaultMemberPermissions(0)
    .addSubcommands([
      (cmd) =>
        cmd
          .setName(AimSubCommands.REGISTER)
          .setDescription(
            "create your AIM screen name (defaults to your server nickname)",
          )
          .addStringOptions([
            (opt) =>
              opt
                .setName("screenname")
                .setDescription(
                  "Optional screen name (letters/digits/spaces, max 16). Omit to use your server nickname.",
                )
                .setRequired(false),
            (opt) =>
              opt
                .setName("password")
                .setDescription(
                  `Optional password (${PASSWORD_RULES}). Omit to auto-generate a random password.`,
                )
                .setRequired(false),
          ]),
      (cmd) =>
        cmd
          .setName(AimSubCommands.PASSWORD)
          .setDescription("rotate your AIM password (signs off all sessions)")
          .addStringOptions([
            (opt) =>
              opt
                .setName("password")
                .setDescription(
                  `Optional new password (${PASSWORD_RULES}). Omit to auto-generate a random password.`,
                )
                .setRequired(false),
          ]),
      (cmd) =>
        cmd
          .setName(AimSubCommands.INFO)
          .setDescription("your AIM account details and connection info"),
      (cmd) =>
        cmd
          .setName(AimSubCommands.UNREGISTER)
          .setDescription("delete your AIM account"),
      (cmd) =>
        cmd
          .setName(AimSubCommands.WHO)
          .setDescription("who's online right now"),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcmd = interaction.options.getSubcommand();
    const { user } = interaction;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const link = aimStore.getLinkByDiscordId(user.id);

    try {
      switch (subcmd) {
        case AimSubCommands.REGISTER: {
          if (link?.status === "banned") {
            await interaction.followUp(
              "Your AIM account is suspended — talk to a mod.",
            );
            return;
          }
          // did user requst a custom name
          const requested = interaction.options.getString("screenname", false);
          // sanitize the requested name, or derive a base name from user nickname
          const base = sanitizeScreenName(
            requested ?? screenNameSeed(interaction),
          );
          // make sure name is valid / available
          if (!base || isReservedScreenName(base)) {
            await interaction.followUp(
              requested
                ? `\`${requested}\` is reserved or invalid — try another name.`
                : "Couldn't derive a screen name from your nickname — ping a mod.",
            );
            return;
          }

          const resolved = resolvePassword(interaction);
          if (!resolved) {
            await interaction.followUp(`Password must be ${PASSWORD_RULES}.`);
            return;
          }

          // Re-register: replaces the old account (one screen name per person)
          if (link) {
            if (base === link.screen_name) {
              await interaction.followUp(
                `You're already \`${link.screen_name}\`. Use \`/aim password\` if you're locked out.`,
              );
              return;
            }
            const age =
              Date.now() -
              new Date(`${link.created_at.replace(" ", "T")}Z`).getTime();
            if (age < REREGISTER_COOLDOWN_MS) {
              await interaction.followUp(
                `You re-registered recently — screen names can change once a day. You're still \`${link.screen_name}\`.`,
              );
              return;
            }
            await AimApi.kickSessions(link.screen_name).catch(() => {});
            await AimApi.deleteUser(link.screen_name);
            aimStore.deleteLink(user.id);
          }

          const screenName = await claimScreenName(
            base,
            resolved.password,
            requested !== null,
          );
          if (!screenName) {
            await interaction.followUp(
              `\`${base}\` is taken — try another name${link ? " (your old account was removed, so don't forget to finish registering)" : ""}.`,
            );
            return;
          }

          aimStore.createLink(user.id, user.username, screenName);
          await postAudit(
            interaction.client,
            `**AIM register** — <@${user.id}> → \`${screenName}\`${link ? ` (replaced \`${link.screen_name}\`)` : ""}`,
          );
          await interaction.followUp(
            `${link ? `\`${link.screen_name}\` is history — buddy lists reset.` : "Welcome to AIM!"}\n\n${credentialLines(
              screenName,
              resolved.generated ? resolved.password : null,
            )}`,
          );
          return;
        }

        case AimSubCommands.PASSWORD: {
          if (!link || link.status !== "active") {
            await interaction.followUp(
              "No active AIM account. `/aim register` to get one.",
            );
            return;
          }
          const resolved = resolvePassword(interaction);
          if (!resolved) {
            await interaction.followUp(`Password must be ${PASSWORD_RULES}.`);
            return;
          }
          await AimApi.setPassword(link.screen_name, resolved.password);
          await AimApi.kickSessions(link.screen_name);
          await interaction.followUp(
            `Password changed and all current sessions ended.\n\n${credentialLines(
              link.screen_name,
              resolved.generated ? resolved.password : null,
            )}`,
          );
          return;
        }

        case AimSubCommands.INFO: {
          if (!link || link.status !== "active") {
            await interaction.followUp(
              "No active AIM account. `/aim register` to get one.",
            );
            return;
          }
          const online = await AimApi.isOnline(link.screen_name).catch(
            () => false,
          );
          await interaction.followUp(
            [
              `**Screen name:** \`${link.screen_name}\` ${online ? "🟢 online" : "⚫ offline"}`,
              `**Registered:** ${link.created_at}`,
              "",
              aimConnectionInfo(),
            ].join("\n"),
          );
          return;
        }

        case AimSubCommands.UNREGISTER: {
          // suspended accounts can't self-delete (ban evasion)
          if (!link || link.status !== "active") {
            await interaction.followUp("No active AIM account to delete.");
            return;
          }
          await AimApi.kickSessions(link.screen_name).catch(() => {});
          await AimApi.deleteUser(link.screen_name);
          aimStore.deleteLink(user.id);
          await postAudit(
            interaction.client,
            `**AIM unregister** — <@${user.id}> (\`${link.screen_name}\`)`,
          );
          await interaction.followUp(`\`${link.screen_name}\` is now deleted.`);
          return;
        }

        case AimSubCommands.WHO: {
          const sessions = await AimApi.getSessions();
          if (!sessions.length) {
            await interaction.followUp(
              "Nobody's on AIM right now. Be the change: sign on.",
            );
            return;
          }
          const names = sessions.map((s) => `\`${s.screen_name}\``).join(", ");
          await interaction.followUp(
            `🟢 Online now (${sessions.length}): ${names}`,
          );
          return;
        }

        default:
          await interaction.followUp("Unknown subcommand.");
      }
    } catch (e) {
      Logger.error(`/aim ${subcmd} failed:`, e);
      await interaction.followUp(
        "Something broke talking to the AIM server — try again in a minute or ping a mod.",
      );
    }
  },
});
