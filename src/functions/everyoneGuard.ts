import { EmbedBuilder, Events, GuildMember, Message } from "discord.js";

import DiscordEventRouter from "../discord/DiscordEventRouter";
import { configuration } from "../server";
import { Logger } from "../utils/logger";

// members who joined more recently than this get kicked for pinging everyone
const NEW_MEMBER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// match the raw text, since spammers usually lack the permission to actually ping
const EVERYONE_PATTERN = /@(everyone|here)\b/i;

export function initEveryoneGuard(eventRouter: DiscordEventRouter) {
  eventRouter.addEventListener(Events.MessageCreate, onMessageCreate);
}

async function onMessageCreate(message: Message) {
  if (!message.inGuild() || message.author.bot) return;
  if (!message.mentions.everyone && !EVERYONE_PATTERN.test(message.content))
    return;

  const member =
    message.member ??
    (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (!member?.joinedAt) return;
  if (Date.now() - member.joinedAt.getTime() > NEW_MEMBER_WINDOW_MS) return;
  if (isStaff(member)) return;

  await message.delete().catch(() => undefined);

  if (!member.kickable) {
    Logger.warn(
      `Everyone guard: cannot kick ${member.user.tag} (${member.id}), missing permissions or role hierarchy.`,
    );
    await modLog(member, message, false);
    return;
  }

  // DM before kicking; the bot can't message them once they've left the server
  await member
    .send(
      `You were removed from **${message.guild.name}** for mentioning @everyone shortly after joining. If this was a mistake, you're welcome to rejoin.`,
    )
    .catch(() => undefined);

  await member.kick("Mentioned @everyone within 7 days of joining");
  await modLog(member, message, true);
}

function isStaff(member: GuildMember) {
  const moderatorRoleId = configuration.roleIds?.["moderator"];
  return !!moderatorRoleId && member.roles.cache.has(moderatorRoleId);
}

async function modLog(
  member: GuildMember,
  message: Message<true>,
  kicked: boolean,
) {
  const modLogChannelId = configuration.channelIds?.["MOD_LOG"];
  if (!modLogChannelId) return;

  const logChannel = await message.guild.channels
    .fetch(modLogChannelId)
    .catch(() => null);
  if (!logChannel?.isTextBased()) return;

  await logChannel.send({
    embeds: [
      new EmbedBuilder({
        title: kicked
          ? "New member kicked for @everyone"
          : "New member used @everyone (kick failed)",
        color: kicked ? 0xed4245 : 0xfee75c,
        fields: [
          { name: "User", value: `${member.user.tag} (<@${member.id}>)` },
          {
            name: "Joined",
            value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,
          },
          { name: "Channel", value: `<#${message.channelId}>` },
          {
            name: "Message",
            value: message.content.slice(0, 1024) || "`(empty)`",
          },
          { name: "User ID", value: member.id },
        ],
      }),
    ],
  });
}
