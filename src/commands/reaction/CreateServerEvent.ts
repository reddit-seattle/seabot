import {
  GuildScheduledEvent,
  GuildScheduledEventCreateOptions,
  GuildScheduledEventPrivacyLevel,
  Message,
  MessageReaction,
  User,
} from "discord.js";

import ReactionCommand from "./ReactionCommand";

import { Environment, UserIDs } from "../../utils/constants";
import {
  isModReaction,
  parseApolloMarkdownLink,
  pullTimeStampsFromApolloString,
} from "../../utils/helpers";

const maximumEventDescriptionLength = 300;

export default new ReactionCommand({
  emojiName: "calendar",
  removeReaction: true,
  adminOnly: true,
  name: "schedule",
  description: `allows mods to create server events out of apollo messages`,
  execute: async (
    reaction: MessageReaction,
    message?: Message,
    user?: User
  ): Promise<GuildScheduledEvent | undefined> => {
    //dangerous - allow seabot to react to a bot's commands for creating server events
    if (!user) {
      return;
    }
    if (
      message?.author?.id !== UserIDs.APOLLO ||
      Environment.DEBUG ||
      !isModReaction(reaction, user)
    ) {
      return;
    }

    const embed = reaction.message.embeds?.[0];
    const { title, description, image, fields, footer } = embed;

    // check for duplicate event
    const allEvents = await reaction.message.guild?.scheduledEvents.fetch();
    const dupes = allEvents?.filter((event) => event.name == title);
    if (dupes?.size) {
      return;
    }

    const { url } = reaction.message;

    const time = fields[0].value; //<t:timestamp:F>\n<:countdown:emojiId> <t:timestamp:R>
    const { start, end } = pullTimeStampsFromApolloString(time);

    const calendarLink = parseApolloMarkdownLink(fields[1].value); // [add to calendar](link)
    const { title: calendarTitle, url: calendarUrl } = calendarLink;

    const event = (await reaction.message.guild?.scheduledEvents.create({
      entityType: 3, // "EXTERNAL",
      name: title?.substring(0, 100), // limited to 100 characters
      privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
      scheduledStartTime: start,
      scheduledEndTime: end,
      image: image?.url,
      description: `${description?.substring(
        0,
        maximumEventDescriptionLength
      )}${
        description?.length &&
        description?.length > maximumEventDescriptionLength
          ? "..."
          : ""
      }

${calendarTitle}:
${calendarUrl}

Event link: ${url}

${footer?.text}`,
      entityMetadata: {
        location: "See event link in description",
      },
      reason: `Auto-created event from bot react: ${url}`,
    } as GuildScheduledEventCreateOptions)) as GuildScheduledEvent;
    //confirm event creation
    await message.react("✅");
    //attempt to message user who created it with link
    await user.send(`Event created: ${event.url}`);
  },
});
