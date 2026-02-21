import {
  LinkButtonBuilder,
  PrimaryButtonBuilder,
  SecondaryButtonBuilder,
} from "@discordjs/builders";
import { APIInteractionDataResolvedChannel } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  CacheType,
  EmbedBuilder,
  GuildBasedChannel,
  Interaction,
  Message,
  MessageComponentInteraction,
  MessageReaction,
  PartialMessage,
  PartialUser,
  User,
} from "discord.js";

import { getUnixTime } from "date-fns";
import { configuration } from "../server";
import { Config, REGEX } from "./constants";

/**
 * Splits message content into an array of arguments by spaces.
 * Includes the actual command arg (without prefix) as the first element.
 * @param message The discord message to parse
 * @returns A string array of [command_arg, arg1, arg2, ...]
 */
export const SplitMessageIntoArgs: (message: Message) => string[] = (
  message,
) => {
  return message.content.slice(Config.prefix.length).trim().split(" ");
};

// credit: Typescript documentation, src
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
  return o[propertyName]; // o[propertyName] is of type T[K]
}

export const replaceMentions: (message: Message | PartialMessage) => string = (
  message,
) => {
  let { content } = message;
  content = content ? content : "";

  const userMatches = Array.from(content.matchAll(REGEX.USER));
  const roleMatches = Array.from(content.matchAll(REGEX.ROLE));
  const channelMatches = Array.from(content.matchAll(REGEX.CHANNEL));
  const emojiMatches = Array.from(content.matchAll(REGEX.EMOJI));

  userMatches.forEach((match) => {
    const id = match[1] as `${bigint}`;
    const username = message.client.users.cache.get(id)?.username ?? "user";
    content = content!.replace(match[0], username);
  });
  roleMatches?.forEach((match) => {
    const id = match[1] as `${bigint}`;
    const role = message.guild?.roles.cache.get(id)?.name ?? "role";
    content = content!.replace(match[0], role);
  });
  channelMatches?.forEach((match) => {
    const id = match[1] as `${bigint}`;
    const channel = message.guild?.channels.cache.get(id)?.name ?? "channel";
    content = content!.replace(match[0], channel);
  });
  emojiMatches?.forEach((match) => {
    const id = match[1] as `${bigint}`;
    const emoji = message.guild?.emojis.cache.get(id)?.name ?? "emoji";
    content = content!.replace(match[0], emoji);
  });
  return content;
};

export const toSarcasticCase = (text: string) => {
  const chars = text.split("");
  let charAt = 0;
  return chars
    .map((char) => {
      if (char.match(/[a-zA-Z]/)) {
        return ++charAt % 2 == 1 ? char.toLowerCase() : char.toUpperCase();
      }
      return char;
    })
    .join("");
};

export const pullTimeStampsFromApolloString = (timestring: string) => {
  const startStr = timestring.match("<t:([0-9]*):F>")?.[1];
  const endStr = timestring.match("<t:([0-9]*):t>")?.[1];
  const start = startStr ? parseInt(startStr) * 1000 : Date.now();
  //if no end - default to one hour
  const end = endStr ? parseInt(endStr) * 1000 : start + 60 * 60 * 1000;
  return { start, end };
};

export const parseApolloMarkdownLink = (apolloLink: string) => {
  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/;
  const parsed = apolloLink.match(markdownLinkRegex);
  return {
    title: parsed?.[1],
    url: parsed?.[2],
  };
};

export const relativeDateString = (input: string | Date) => {
  const time = getUnixTime(new Date(input));
  return `<t:${time}:R>`;
};

export const isModReaction = (
  reacc: MessageReaction,
  user: User | PartialUser,
) => {
  const guildUser = reacc.message.guild?.members.cache.get(user.id);
  return guildUser?.roles.cache.has(configuration.roleIds.moderator) ?? false;
};

type ModActionOptions = {
  anon: boolean;
  user?: User;
  channel?: APIInteractionDataResolvedChannel | GuildBasedChannel;
  messageLink?: string;
};

export const buildModActionRow = (
  guildId: string,
  options: ModActionOptions,
) => {
  const ignoreButton = new SecondaryButtonBuilder()
    .setCustomId("ignoreReport")
    .setLabel("🔇Ignore");

  const ackButton = new PrimaryButtonBuilder()
    .setCustomId("ackReport")
    .setLabel("✅Acknowledge");

  let viewButton: LinkButtonBuilder | undefined = undefined;

  if (options.messageLink || options?.channel?.id) {
    const url =
      options.messageLink || createChannelLink(guildId, options.channel!.id);
    viewButton = new LinkButtonBuilder().setLabel("🔗Link").setURL(url);
  }
  const buttons = [
    ignoreButton,
    ackButton,
    // ...(options.anon ? [] : [replyButton]), // reply button WIP
    ...(viewButton ? [viewButton] : []),
  ];
  const modActionRow = new ActionRowBuilder().addComponents(buttons);
  return modActionRow;
};

export const createChannelLink = (guildId: string, channelId: string) => {
  return `https://discordapp.com/channels/${guildId}/${channelId}`;
};

export const processModReportInteractions = async (
  interaction: Interaction<CacheType>,
) => {
  if (
    !interaction.isButton() ||
    interaction.channelId != configuration.channelIds?.["MOD_REPORTS"]
  )
    return;

  const processDict: {
    [id: string]: (i: MessageComponentInteraction<CacheType>) => void;
  } = {
    ignoreReport: async (i) => {
      const embed = i.message.embeds?.[0];
      const reporter = embed?.author?.name;
      const newEmbed = new EmbedBuilder(embed?.data).setColor(0xbbbbbb);
      await i.update({
        content: `Report ignored by <@${i.user.id}>`,
        embeds: [newEmbed],
        components: [],
      });
    },
    ackReport: async (i) => {
      const embed = i.message.embeds?.[0];
      const newEmbed = new EmbedBuilder(embed?.data).setColor(0x00ff00);
      await i.update({
        content: `Report acknowledged by <@${i.user.id}>`,
        embeds: [newEmbed],
        components: [],
      });
    },
  };

  processDict?.[interaction.customId]?.(interaction);
};

/**
 * Formats uptime in seconds to a human-readable string
 * @param seconds Uptime in seconds
 * @returns Formatted string like "2d 5h 30m 15s"
 */
export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

import { ColorResolvable, Colors, resolveColor } from "discord.js";

/**
 * Validates and prepares a color string as a ColorResolvable type.
 * Supports Discord color names, hex strings (with or without #), and other ColorResolvable formats.
 * @param color - The color string to validate
 * @returns ColorResolvable if valid, null if invalid
 */
export const validateColor = (color: string | null): ColorResolvable | null => {
  if (!color) return null;

  try {
    // Clean the input
    let cleanColor = color.trim();

    // Check if it's a Discord color name (case insensitive)
    const colorKey =
      cleanColor.charAt(0).toUpperCase() + cleanColor.slice(1).toLowerCase();
    if (Colors[colorKey as keyof typeof Colors] !== undefined) {
      return colorKey as keyof typeof Colors;
    }

    // If it looks like a hex number without #, add the #
    if (/^[0-9A-Fa-f]{6}$/.test(cleanColor)) {
      cleanColor = `#${cleanColor}`;
    }

    // Test if it's a valid ColorResolvable by trying to resolve it
    resolveColor(cleanColor as ColorResolvable);
    return cleanColor as ColorResolvable;
  } catch (error) {
    return null;
  }
};

/**
 * Normalizes a year string to a 4-digit year.
 * If the input is a 2-digit year, it is assumed to be in the current century.
 * If the input is missing or invalid, it defaults to the current year.
 * @param yearStr - The year string to normalize
 * @returns A 4-digit year as a number
 */
export const normalizeYear = (yearStr: string | undefined): number => {
  const currentYear = new Date().getFullYear();
  const currentCentury = currentYear - (currentYear % 100);
  if (!yearStr) return currentYear;
  let year = parseInt(yearStr, 10);
  if (year < 100) {
    year += currentCentury;
  }
  return year;
};
