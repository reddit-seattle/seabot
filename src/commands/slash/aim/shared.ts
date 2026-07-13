import { Client, TextChannel } from "discord.js";
import { Environment } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";
import { aimStore } from "../../../db/AimStore";
import { AimApi } from "../../../utils/aim/AimApi";

/** Post to the mod audit channel, if configured. This is the audit log. */
export async function postAudit(client: Client, message: string) {
  const channelId = Environment.aimAuditChannelId;
  if (!channelId) return;
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel && channel instanceof TextChannel) {
      await channel.send(message);
    }
  } catch (e) {
    Logger.warn("AIM audit channel post failed:", e);
  }
}

/**
 * Bans an AIM user by discord ID + kicks active sessions
 */
export async function banAimUser(
  client: Client,
  discordId: string,
  actor: string,
  reason?: string | null,
): Promise<string | null> {
  const link = aimStore.getLinkByDiscordId(discordId);

  // no-op if user has no aim account / already banned
  if (!link || link.status === "banned") {
    return null;
  }

  await AimApi.setSuspendedStatus(link.screen_name, true);
  await AimApi.kickSessions(link.screen_name);
  aimStore.setLinkStatus(discordId, "banned");

  await postAudit(
    client,
    `**AIM ban** — <@${discordId}> (\`${link.screen_name}\`) by ${actor}${reason ? `: ${reason}` : ""}`,
  );
  return link.screen_name;
}

export function aimConnectionInfo(): string {
  return [
    `**Server:** \`${Environment.aimHost}\``,
    `**Port:** \`${Environment.aimPort}\``,
    "",
    "Works with AIM 5.x-era clients and Pidgin (AIM protocol).",
    "*AIM is a 2003 plaintext protocol — **never reuse a real password**, and don't say anything you wouldn't have said on AIM in 2003.*",
  ].join("\n");
}
