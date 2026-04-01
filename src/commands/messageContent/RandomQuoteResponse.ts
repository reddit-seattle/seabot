import { Message } from "discord.js";
import ContentCommand from "./ContentCommand";
import { quoteChannelStore } from "../../db";
import { QuoteService } from "../../services/QuoteService";
import { ClaudeQuoteSelectionService } from "../../services/ClaudeQuoteSelectionService";
import { GeminiQuoteSelectionService } from "../../services/GeminiQuoteSelectionService";

export default new ContentCommand({
  name: "random-quote-response",
  description: "Randomly posts quotes in configured channels",
  trigger: /^/, // Match every message
  handler: async (message: Message) => {
    // Skip if bot or webhook
    if (message.author.bot || message.author.system) {
      return;
    }

    // Check if channel is enabled
    const channelConfig = quoteChannelStore.getChannel(message.channelId);
    if (!channelConfig) {
      return;
    }

    // Check if service is loaded
    if (!QuoteService.isLoaded) {
      return;
    }

    // Roll chance
    const chance = channelConfig.chance;
    const roll = Math.random();
    if (roll > chance) {
      return;
    }

    try {
      let quote;

      // Use AI selection if claude/gemini mode, otherwise random
      if (channelConfig.mode === "claude") {
        quote = await ClaudeQuoteSelectionService.selectMemeWorthyQuote(
          message.content,
          message.channelId,
        );
        if (!quote) {
          quote = QuoteService.getRandomQuote();
        }
      } else if (channelConfig.mode === "gemini") {
        quote = await GeminiQuoteSelectionService.selectMemeWorthyQuote(
          message.content,
          message.channelId,
        );
        if (!quote) {
          quote = QuoteService.getRandomQuote();
        }
      } else {
        quote = QuoteService.getRandomQuote();
      }

      if (!quote) {
        return;
      }

      // Build message with optional link to original
      let content = quote.text;
      if (quote.id && quote.server && quote.channelId && quote.messageId) {
        const link = `https://discord.com/channels/${quote.server}/${quote.channelId}/${quote.messageId}`;
        content += ` ([#${quote.id}](${link}))`;
      }

      // Send the quote
      await message.reply({
        content,
        allowedMentions: { repliedUser: true },
      });
    } catch (error) {
      console.error("Failed to send random quote:", error);
    }
  },
});
