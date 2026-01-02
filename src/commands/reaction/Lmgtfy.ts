import { Message, MessageReaction } from "discord.js";
import { replaceMentions } from "../../utils/helpers";
import ReactionCommand from "./ReactionCommand";

export default new ReactionCommand({
  name: "lmgtfy",
  description: `react to a post to help someone google its contents`,
  execute: async (reaction: MessageReaction) => {
    const message = reaction.message as Message;
    const { content } = message;
    if (!content) {
      return;
    }
    const resultantContent = replaceMentions(message);
    message.reply(
      `https://lmgtfy.app/?q=${encodeURIComponent(resultantContent)}`,
    );
  },
});
