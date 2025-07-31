import {
    APIEmbedField,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";
import { RedditResponse, SubredditAbout, SubredditHot } from "./models";

export default new SlashCommand({
    description: "get subreddit stats",
    name: "subredditstats",
    builder: new ChatInputCommandBuilder()
        .setName("subredditstats")
        .setDescription("get subreddit stats")
        .addStringOptions([
            (o) => o.setDescription("subreddit to fetch stats for").setName("sub").setRequired(false)
        ]),
    execute: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();
        
        try {
            const subreddit =
                interaction.options.getString("sub", false) || "seattle";
            
            // Fetch subreddit about info
            let aboutResponse: Response;
            try {
                aboutResponse = await fetch(`https://reddit.com/r/${subreddit}/about.json`);
                if (!aboutResponse.ok) {
                    interaction.followUp(`Unable to fetch data for r/${subreddit}.`);
                    return;
                }
            } catch (fetchError) {
                console.error("Error fetching subreddit about:", fetchError);
                interaction.followUp("Network error while fetching subreddit info.");
                return;
            }

            const aboutData: RedditResponse<SubredditAbout> = await aboutResponse.json();
            const { data: subredditData } = aboutData;

            if (!subredditData) {
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
            } = subredditData;

            // shame, shame
            if (over18) {
                interaction.followUp({ flags: MessageFlags.Ephemeral, content: "ಠ_ಠ" });
                return;
            }

            // Fetch hot posts
            let hotResponse: Response;
            try {
                hotResponse = await fetch(`https://reddit.com/r/${subreddit}/hot.json`);
                if (!hotResponse.ok) {
                    interaction.followUp("Unable to fetch hot posts.");
                    return;
                }
            } catch (fetchError) {
                console.error("Error fetching subreddit hot posts:", fetchError);
                interaction.followUp("Network error while fetching hot posts.");
                return;
            }

            const hotData: RedditResponse<SubredditHot> = await hotResponse.json();
            const { data: postsData } = hotData;

            if (!postsData || !postsData.children) {
                interaction.followUp("Unable to fetch hot posts.");
                return;
            }

            const { children } = postsData;

            const posts = children
                .map((c) => c.data)
                // .filter(post => !post.over_18) // no nsfw
                .filter((post) => post && !post.stickied) // don't care about stickied posts, also filter out null/undefined posts
                .slice(0, 3);

            const embedFields: APIEmbedField[] = [
                {
                    name: "Active users",
                    value: `${(active_user_count || 0).toLocaleString("en")}`,
                },
                {
                    name: "Total Subscribers",
                    value: `${(subscribers || 0).toLocaleString("en")}`,
                },
                {
                    name: "Top 3 posts",
                    value: "Sorted by /hot",
                },
                ...posts.map((post) => {
                    const { title, score, permalink, num_comments, over_18 } = post;
                    const truncatedTitle = (title && title.length > 255) ? `${title.slice(0, 252)}...` : (title || "Untitled");
                    return {
                        name: `${truncatedTitle}`,
                        value: `[**Link${
                            over_18 ? " ⚠️NSFW⚠️" : ""
                        }**](https://reddit.com${permalink || ""}) | ${score || 0} karma | ${num_comments || 0} comments`,
                    };
                }),
            ];
            
            // Safe image URL handling
            const image = (community_icon && community_icon.split("?")?.[0]) ||
                "https://www.redditstatic.com/desktop2x/img/id-cards/snoo-home@2x.png";
            
            const embed = new EmbedBuilder()
                .setTitle(display_name_prefixed || `r/${subreddit}`)
                .setDescription(public_description || "No description available")
                .addFields(embedFields)
                .setThumbnail(image);

            interaction.followUp({ embeds: [embed] });
        } catch (error) {
            console.error("Error in subreddit stats command:", error);
            interaction.followUp("An error occurred while fetching subreddit stats.");
        }
    },
});
