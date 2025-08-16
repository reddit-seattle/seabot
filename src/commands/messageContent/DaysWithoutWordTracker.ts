import { AttachmentBuilder, Message } from "discord.js";
import { wordTrackerStore } from "../../db";
import { DaysWithoutImageGenerator } from "../../utils/DaysWithoutImageGenerator";
import { Environment } from "../../utils/constants";
import ContentCommand from "./ContentCommand";

const rawWords = (Environment.trackedWords || "").split(",").map(w => w.trim()).filter(Boolean);
const TRACKED_WORDS = rawWords.length ? rawWords : ["the thing"];
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

// Escape any special chars
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WORDS_REGEX = new RegExp(`\\b(${TRACKED_WORDS.map(escapeRegex).join("|")})\\b`, "i");

export default new ContentCommand({
  name: "days-without-tracker",
  description: "Tracks usage of specific words and generates 'days without' images",
  trigger: WORDS_REGEX,
  handler: async (message: Message) => {
    try {
      // Find which word was mentioned
      const content = message.content.toLowerCase();
      const triggeredWord = TRACKED_WORDS.find(word => new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(content));

      if (!triggeredWord) return;

      let daysSince = 0;
      const telemetryDb = wordTrackerStore;
      const tracker = telemetryDb.getWordTracker(triggeredWord);

      if (tracker) {
        // days since last occurrence
        const lastSeen = new Date(tracker.last_seen);
        daysSince = Math.max(0, Math.floor(
          (Date.now() - lastSeen.getTime()) / (MILLISECONDS_PER_DAY)
        ));
        if (daysSince === 0) {
          return; // Already triggered today
        }
      }

      // Update (increments count)
      telemetryDb.updateWordTracker(
        triggeredWord,
        message.channel.id,
        message.author.id
      );

      const imageBuffer = await DaysWithoutImageGenerator.generateDaysWithoutImage(
        `${triggeredWord}`,
        daysSince
      );
      const attachment = new AttachmentBuilder(imageBuffer, {
        name: `days-without-${triggeredWord}.png`
      });

      await message.reply({
        files: [attachment]
      });
    } catch (error) {
      console.error("Error in days-without-tracker:", error);
    }
  }
});
