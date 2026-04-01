import { Anthropic } from "@anthropic-ai/sdk";
import { Logger } from "../utils/logger";
import { Environment } from "../utils/constants";
import { QuoteService, Quote } from "./QuoteService";

interface TokenIndex {
  [normalizedWord: string]: number[]; // quote IDs
}

interface UsageMetrics {
  dailyRequestCount: number;
  dailyInputTokens: number;
  dailyOutputTokens: number;
  lastResetDate: string;
  perChannelCooldowns: { [channelId: string]: number }; // timestamp
}

export class QuoteSelectionService {
  private static _client: Anthropic | null = null;
  private static _tokenIndex: TokenIndex = {};
  private static _usage: UsageMetrics = {
    dailyRequestCount: 0,
    dailyInputTokens: 0,
    dailyOutputTokens: 0,
    lastResetDate: new Date().toISOString().split("T")[0],
    perChannelCooldowns: {},
  };

  private static readonly DAILY_REQUEST_CAP = 420;
  private static readonly PER_CHANNEL_COOLDOWN_MS = 5000; // 5 seconds between requests per channel
  private static readonly MAX_INPUT_LENGTH = 1000; // Truncate message to this length
  private static readonly SHORTLIST_SIZE = 50;

  private static readonly DEFAULT_PROMPT_TEMPLATE =
    "Pick the funniest quote to reply with. Respond with ONLY the number.\n\n" +
    "Message: \"{message}\"\n\nQuotes:\n{quotes}";

  static initialize(): boolean {
    if (!Environment.claudeApiKey) {
      Logger.warn("CLAUDE_API_KEY not set, Claude selection mode disabled");
      return false;
    }

    try {
      this._client = new Anthropic({
        apiKey: Environment.claudeApiKey,
      });
      this.buildTokenIndex();
      Logger.info("QuoteSelectionService initialized");
      return true;
    } catch (error) {
      Logger.error("Failed to initialize QuoteSelectionService:", error);
      return false;
    }
  }

  private static buildTokenIndex(): void {
    this._tokenIndex = {};

    QuoteService.iterateQuotes((quote, idx) => {
      const words = quote.text
        .toLowerCase()
        .match(/\b\w+\b/g) || [];

      words.forEach((word) => {
        if (!this._tokenIndex[word]) {
          this._tokenIndex[word] = [];
        }
        this._tokenIndex[word].push(idx);
      });
    });

    Logger.info(`Built token index with ${Object.keys(this._tokenIndex).length} unique tokens`);
  }

  private static getShortlist(messageContent: string): Quote[] {
    const words = messageContent
      .toLowerCase()
      .match(/\b\w+\b/g) || [];

    const scoreMap = new Map<number, number>();

    // Score quotes by word overlap
    words.forEach((word) => {
      const matchingIndices = this._tokenIndex[word] || [];
      matchingIndices.forEach((idx) => {
        scoreMap.set(idx, (scoreMap.get(idx) || 0) + 1);
      });
    });

    // Sort by score and take top results
    const sorted = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.SHORTLIST_SIZE)
      .map(([idx]) => QuoteService.getQuoteByIndex(idx))
      .filter((q): q is Quote => q !== null);

    // If no matches, return random sample
    if (sorted.length === 0) {
      const totalQuotes = QuoteService.getQuoteCount();
      const sampleSize = Math.min(this.SHORTLIST_SIZE, totalQuotes);
      const seen = new Set<number>();
      while (sorted.length < sampleSize) {
        const idx = Math.floor(Math.random() * totalQuotes);
        if (seen.has(idx)) continue;
        seen.add(idx);
        const q = QuoteService.getQuoteByIndex(idx);
        if (q) sorted.push(q);
      }
    }

    return sorted;
  }

  private static checkRateLimit(channelId: string): boolean {
    // Reset daily metrics if new day
    const today = new Date().toISOString().split("T")[0];
    if (today !== this._usage.lastResetDate) {
      this._usage.dailyRequestCount = 0;
      this._usage.dailyInputTokens = 0;
      this._usage.dailyOutputTokens = 0;
      this._usage.lastResetDate = today;
      this._usage.perChannelCooldowns = {};
    }

    // Check daily cap
    if (this._usage.dailyRequestCount >= this.DAILY_REQUEST_CAP) {
      Logger.warn("Daily Claude request cap reached");
      return false;
    }

    // Check per-channel cooldown
    const lastCallTime = this._usage.perChannelCooldowns[channelId] || 0;
    if (Date.now() - lastCallTime < this.PER_CHANNEL_COOLDOWN_MS) {
      return false;
    }

    return true;
  }

  static async selectMemeWorthyQuote(
    messageContent: string,
    channelId: string,
  ): Promise<Quote | null> {
    if (!this._client) {
      return null;
    }

    if (!this.checkRateLimit(channelId)) {
      return null;
    }

    try {
      const shortlist = this.getShortlist(messageContent);
      if (shortlist.length === 0) {
        return null;
      }

      // If shortlist is small enough, just pick randomly
      if (shortlist.length === 1) {
        return shortlist[0];
      }

      const truncatedMessage = messageContent.substring(
        0,
        this.MAX_INPUT_LENGTH,
      );

      const quotesBlock = shortlist
        .map((q, i) => `${i + 1}. "${q.text}"`)
        .join("\n");

      const prompt = this.buildPrompt(
        truncatedMessage,
        quotesBlock,
        shortlist.length,
      );

      const message = await this._client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Update metrics
      this._usage.dailyRequestCount += 1;
      this._usage.dailyInputTokens += message.usage.input_tokens;
      this._usage.dailyOutputTokens += message.usage.output_tokens;
      this._usage.perChannelCooldowns[channelId] = Date.now();

      // Parse response
      const responseText = message.content[0];
      if (responseText.type !== "text") {
        return null;
      }

      const quoteNum = parseInt(responseText.text.trim());
      if (isNaN(quoteNum) || quoteNum < 1 || quoteNum > shortlist.length) {
        return shortlist[0];
      }

      return shortlist[quoteNum - 1];
    } catch (error) {
      Logger.error("Failed to select quote via Claude:", error);
      return null;
    }
  }

  static getUsageMetrics() {
    return {
      ...this._usage,
      isEnabled: this._client !== null,
    };
  }

  private static buildPrompt(
    message: string,
    quotes: string,
    count: number,
  ): string {
    const template =
      Environment.quoteSelectionPrompt || this.DEFAULT_PROMPT_TEMPLATE;
    return template
      .replace(/\{message\}/g, message)
      .replace(/\{quotes\}/g, quotes)
      .replace(/\{count\}/g, String(count));
  }

  static resetDaily(): void {
    this._usage.dailyRequestCount = 0;
    this._usage.dailyInputTokens = 0;
    this._usage.dailyOutputTokens = 0;
    this._usage.lastResetDate = new Date().toISOString().split("T")[0];
  }
}
