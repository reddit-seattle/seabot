import {
  CacheType,
  GuildBasedChannel,
  Interaction,
  Message,
  ButtonBuilder,
  MessageComponentInteraction,
  EmbedBuilder,
  MessageReaction,
  PartialUser,
  User,
  ActionRowBuilder,
  PartialMessage,
} from "discord.js";
import { now } from "moment";
import { APIInteractionDataResolvedChannel } from "discord-api-types/v10";
import { ButtonStyle } from "discord-api-types/v10";

import { Config, Environment, REGEX } from "./constants";
import { configuration } from "../server";
import { getUnixTime } from "date-fns";

/**
 * Splits message content into an array of arguments by spaces.
 * Includes the actual command arg (without prefix) as the first element.
 * @param message The discord message to parse
 * @returns A string array of [command_arg, arg1, arg2, ...]
 */
export const SplitMessageIntoArgs: (message: Message) => string[] = (
  message
) => {
  return message.content.slice(Config.prefix.length).trim().split(" ");
};

// credit: Typescript documentation, src
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
  return o[propertyName]; // o[propertyName] is of type T[K]
}

export const replaceMentions: (message: Message | PartialMessage) => string = (
  message
) => {
  let { content } = message;
  content = content ? content : "";

  const userMatches = Array.from(content.matchAll(REGEX.USER));
  const roleMatches = Array.from(content.matchAll(REGEX.ROLE));
  const channelMatches = Array.from(content.matchAll(REGEX.CHANNEL));
  const emojiMatches = Array.from(content.matchAll(REGEX.EMOJI));

  userMatches.forEach((match, ix) => {
    const id = match[1] as `${bigint}`;
    const username = message.client.users.cache.get(id)?.username ?? "user";
    content = content!.replace(match[0], username);
  });
  roleMatches?.forEach((match, ix) => {
    const id = match[1] as `${bigint}`;
    const role = message.guild?.roles.cache.get(id)?.name ?? "role";
    content = content!.replace(match[0], role);
  });
  channelMatches?.forEach((match, ix) => {
    const id = match[1] as `${bigint}`;
    const channel = message.guild?.channels.cache.get(id)?.name ?? "channel";
    content = content!.replace(match[0], channel);
  });
  emojiMatches?.forEach((match, ix) => {
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
  const start = startStr ? parseInt(startStr) * 1000 : now();
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
  const time = getUnixTime(new Date(input))
  return `<t:${time}:R>`
}


export const isModReaction = (
  reacc: MessageReaction,
  user: User | PartialUser
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
  options: ModActionOptions
) => {
  const ignoreButton = new ButtonBuilder()
    .setCustomId("ignoreReport")
    .setEmoji("🔇")
    .setLabel("Ignore")
    .setStyle(ButtonStyle.Danger);

  const ackButton = new ButtonBuilder()
    .setCustomId("ackReport")
    .setEmoji("✅")
    .setLabel("ACK")
    .setStyle(ButtonStyle.Primary);

  // const replyButton = new MessageButton()
  //     .setCustomId('replyReport')
  //     .setEmoji('✉️')
  //     .setLabel('Reply')
  //     .setStyle(MessageButtonStyles.SECONDARY);

  let viewButton: ButtonBuilder | undefined = undefined;

  if (options.messageLink || options?.channel?.id) {
    viewButton = new ButtonBuilder()
      .setEmoji("👀")
      .setLabel("View")
      .setStyle(ButtonStyle.Link);
    if (options.messageLink) {
      viewButton?.setURL(options.messageLink);
    } else if (options?.channel?.id) {
      viewButton?.setURL(createChannelLink(guildId, options.channel.id));
    }
  }
  const buttons = [
    ignoreButton,
    ackButton,
    // ...(options.anon ? [] : [replyButton]), // reply button WIP
    ...(viewButton ? [viewButton] : []),
  ];
  const modActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    buttons
  );
  return modActionRow;
};

export const createChannelLink = (guildId: string, channelId: string) => {
  return `https://discordapp.com/channels/${guildId}/${channelId}`;
};

export const processModReportInteractions = async (
  interaction: Interaction<CacheType>
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
      const reporter = i.message.embeds?.[0].author?.name;
      await i.update({
        content: `Report by ${reporter ?? "anonymous"} ignored`,
        embeds: [],
        components: [],
      });
    },
    ackReport: async (i) => {
      const newEmbed = EmbedBuilder.from(i.message.embeds?.[0]).setColor(
        "Green"
      );
      await i.update({
        content: `${i.message.content}\nReport was ACK'd by: ${i.user.username}`,
        embeds: [newEmbed],
        components: [],
      });
    },
    replyReport: async (i) => {
      // const embed = i.message.embeds?.[0] as MessageEmbed;
      // const embedField = embed?.fields?.[0];
      // if(embedField.name == 'ReplyID') {
      //     const user = embed?.fields?.[1].value;
      //     const modal = new ModalBuilder()
      //         .setCustomId(`reportResponse_${embedField.value}`)
      //         .setTitle(`Reply to ${user}`);
      //     const messageInput = new TextInputBuilder()
      //         .setCustomId(`reportResponse_message_${embedField.value}`)
      //         .setLabel('Message')
      //         .setStyle(TextInputStyle.Paragraph)
      //     const inputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput);
      //     modal.addComponents(inputRow);
      // }
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
