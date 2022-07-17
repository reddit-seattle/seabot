import assert from "assert";
import {
    DiscordAPIError,
    GuildScheduledEvent,
    GuildScheduledEventCreateOptions,
    Message,
    PartialMessage,
} from "discord.js";
import _ from "underscore";
import { ReactionCommand } from "../models/Command";
import { EmojiIDs, Environment, UserIDs } from "../utils/constants";
import {
    parseApolloMarkdownLink,
    pullTimeStampsFromApolloString,
    replaceMentions,
} from "../utils/helpers";

export const googleReact: ReactionCommand = {
    removeReaction: false,
    emojiId: EmojiIDs.GOOGLE,
    name: "google",
    description: `react to a post to google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if (!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply({
            content: `https://www.google.com/search?q=${encodeURIComponent(
                resultantContent
            )}`,
            allowedMentions: {
                repliedUser: false,
            },
        });
    },
};

export const lmgtfyReact: ReactionCommand = {
    removeReaction: false,
    emojiId: EmojiIDs.LMGTFY,
    name: "lmgtfy",
    description: `react to a post to help someone google its contents`,
    execute: async (message: Message | PartialMessage) => {
        const { content } = message;
        if (!content) {
            return;
        }
        const resultantContent = replaceMentions(message);
        message.reply(
            `https://lmgtfy.app/?q=${encodeURIComponent(resultantContent)}`
        );
    },
};

export const createServerEvent: ReactionCommand = {
    removeReaction: true,
    emojiId: "🗓️",
    adminOnly: true,
    name: "schedule",
    description: `allows mods to create server events out of apollo messages`,
    execute: async (
        message: Message | PartialMessage
    ): Promise<GuildScheduledEvent | undefined> => {

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
                name: title,
                privacyLevel: 2, // "GUILD_ONLY",
                scheduledStartTime: start,
                scheduledEndTime: end,
                image: image?.url,
                description: `
                    ${description}
                
                    ${calendarTitle}:
                    ${calendarUrl}
                
                    Event link: ${url}
                
                    ${footer?.text}
                `,
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
};
