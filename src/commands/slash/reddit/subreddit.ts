import {
    APIEmbedField,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";

import SlashCommand from "../SlashCommand";
import { RedditResponse, SubredditAbout, SubredditHot } from "./models";

export default new SlashCommand({
    description: "get subreddit stats",
    name: "subredditstats",
    builder: new SlashCommandBuilder()
        .setName("subredditstats")
        .setDescription("get subreddit stats")
        .addStringOption((o) =>
            o.setDescription("subreddit to fetch stats for").setName("sub")
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();
        const subreddit =
            interaction.options.getString("sub", false) || "seattle";
        const aboutResponse: RedditResponse<SubredditAbout> = await (
            await fetch(`https://reddit.com/r/${subreddit}/about.json`)
        ).json();
        const { data: aboutData } = aboutResponse;

        if (!aboutData) {
            interaction.followUp("That subreddit returned no public data.");
            return;
        }

        const {
            public_description,
            over18,
            community_icon,
            active_user_count,
            subscribers,
            display_name_prefixed,
        } = aboutData;

        // shame, shame
        if (over18) {
            interaction.followUp({ ephemeral: true, content: "ಠ_ಠ" });
            return;
        }

        const hotResponse: RedditResponse<SubredditHot> = await (
            await fetch(`https://reddit.com/r/${subreddit}/hot.json`)
        ).json();
        const { data: hotData } = hotResponse;
        const { children } = hotData;

        const posts = children
            .map((c) => c.data)
            // .filter(post => !post.over_18) // no nsfw
            .filter((post) => !post.stickied) // don't care about stickied posts
            .slice(0, 3);

        const embedFields: APIEmbedField[] = [
            {
                name: "Active users",
                value: `${active_user_count.toLocaleString("en")}`,
            },
            {
                name: "Total Subscribers",
                value: `${subscribers.toLocaleString("en")}`,
            },
            {
                name: "Top 3 posts",
                value: "Sorted by /hot",
            },
            ...posts.map((post, i) => {
                const { title, score, permalink, num_comments, over_18 } = post;
                return {
                    name: `${title}`,
                    value: `[**Link${
                        over_18 ? " ⚠️NSFW⚠️" : ""
                    }**](https://reddit.com${permalink}) | ${score} karma | ${num_comments} comments`,
                };
            }),
        ];
        const image =
            community_icon.split("?")?.[0] ||
            "https://www.redditstatic.com/desktop2x/img/id-cards/snoo-home@2x.png";
        const embed = new EmbedBuilder()
            .setTitle(display_name_prefixed)
            .setDescription(public_description)
            .addFields(embedFields)
            .setThumbnail(image);

        interaction.followUp({ embeds: [embed] });
    },
});
