import { Message, MessageReaction } from "discord.js";
import { replaceMentions } from "../../utils/helpers";
import ReactionCommand from "./ReactionCommand";

export default new ReactionCommand({
  name: "google",
  description: `react to a post to google its contents`,
  execute: async (reaction: MessageReaction) => {
    const message = reaction.message as Message;
    const { content } = message;
    if (!content) {
      return;
    }

    const resultantContent = replaceMentions(message);
    message.reply({
      content: `https://www.google.com/search?q=${encodeURIComponent(
        resultantContent,
      )}`,
      allowedMentions: {
        repliedUser: false,
      },
    });
  },
});
