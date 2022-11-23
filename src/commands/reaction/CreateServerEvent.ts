import {
    DiscordAPIError,
    GuildScheduledEvent,
    GuildScheduledEventCreateOptions,
    Message,
    PartialMessage,
} from "discord.js";
import { parseApolloMarkdownLink, pullTimeStampsFromApolloString } from "../../utils/helpers";
import ReactionCommand from "./ReactionCommand";

export default new ReactionCommand({
    emojiName: "calendar",
    removeReaction: true,
    adminOnly: true,
    name: "schedule",
    help: `allows mods to create server events out of apollo messages`,
    description: `allows mods to create server events out of apollo messages`,
    execute: async (message: Message | PartialMessage): Promise<GuildScheduledEvent | undefined> => {
        const embed = message.embeds?.[0];
        const { title, description, image, fields, footer } = embed;

        // check for duplicate event
        const allEvents = await message.guild?.scheduledEvents.fetch();
        const dupes = allEvents?.filter((event) => event.name == title);
        if (dupes?.size) {
            return;
        }

        const { url } = message;

        const time = fields[0].value; //<t:timestamp:F>\n<:countdown:emojiId> <t:timestamp:R>
        const { start, end } = pullTimeStampsFromApolloString(time);

        const calendarLink = parseApolloMarkdownLink(fields[1].value); // [add to calendar](link)
        const { title: calendarTitle, url: calendarUrl } = calendarLink;

        try {
            return (await message.guild?.scheduledEvents.create({
                entityType: 3, // "EXTERNAL",
                name: title?.substring(0, 100), // limited to 100 characters
                privacyLevel: 2, // "GUILD_ONLY",
                scheduledStartTime: start,
                scheduledEndTime: end,
                image: image?.url,
                description: `${description?.substring(0, 300)}${
                    description?.length && description?.length > 300 ? "..." : ""
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
        } catch (err: any) {
            if (err instanceof DiscordAPIError) {
                console.dir(err);
            }
        }
    },
});
