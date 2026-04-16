import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Environment } from "../../../utils/constants";
import { parseEventDate } from "../../../utils/eventDateParser";
import SlashCommand from "../SlashCommand";

export type EventEntry = {
  label: string;
  start: Date;
  end?: Date;
};

const DEFAULT_DAYS = 7;
const MAX_TITLE_LENGTH = 50;
const MAX_THREAD_AGE_MONTHS = 11;

// Returns M/D
function shortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Helper to clean event titles by removing bracketed date/range substrings
function createEventLabel(
  name: string,
  url: string,
  maxLength: number = MAX_TITLE_LENGTH,
): string {
  let label = name;
  // Remove any bracketed chunk that contains a date/range
  label = label.replace(/\[(?:[^\]]*\d{1,2}\/\d{1,2}[^\]]*)\]/g, "").trim();
  if (label.length > maxLength) {
    label = label.slice(0, maxLength - 3) + "...";
  }
  return `[${label}](${url})`;
}

export default new SlashCommand({
  name: "events",
  description: "Browse upcoming community events",
  builder: new ChatInputCommandBuilder()
    .setName("events")
    .setDescription("Browse upcoming community events")
    .addSubcommands([
      (cmd) => cmd.setName("list").setDescription("List upcoming events"),
    ]),
  execute: async function (interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    if (!Environment.eventsChannelId) {
      await interaction.followUp({
        content: "Events channel is not configured.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const windowEnd = new Date(now.getTime() + DEFAULT_DAYS * oneDayInMs);

    const guild = interaction.guild;
    if (!guild) return;

    const channel = await guild.channels
      .fetch(Environment.eventsChannelId)
      .catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildForum) {
      await interaction.followUp({
        content: "Events channel not found or is not a forum channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [active, archived] = await Promise.all([
      channel.threads.fetchActive(),
      channel.threads.fetchArchived({ limit: 100 }),
    ]);

    const allThreads = [
      ...active.threads.values(),
      ...archived.threads.values(),
    ];

    const singleDay: EventEntry[] = [];
    const multiDay: EventEntry[] = [];

    for (const thread of allThreads) {
      const { name, url } = thread;

      // Skip threads created more than MAX_THREAD_AGE_MONTHS months ago
      if (thread.createdAt) {
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - MAX_THREAD_AGE_MONTHS);
        if (thread.createdAt < cutoff) continue;
      }

      const dates = parseEventDate(name);
      if (!dates || !dates.start) continue; // Skip if no valid start date

      const { start, end } = dates;
      const label = createEventLabel(name, url);

      // Calculate the end of the event's start day
      const endOfStartDay = new Date(start);
      endOfStartDay.setHours(23, 59, 59, 999);

      if (end) {
        // Multi-day: include if the event overlaps with the window
        const endOfEndDay = new Date(end);
        endOfEndDay.setHours(23, 59, 59, 999);
        if (start <= windowEnd && endOfEndDay >= now) {
          multiDay.push({ label, start, end });
        }
      } else {
        // Single-day: include if the event's day has not completely passed and is within the window
        if (endOfStartDay >= now && start <= windowEnd) {
          singleDay.push({ label, start });
        }
      }
    }

    singleDay.sort((a, b) => a.start.getTime() - b.start.getTime());
    multiDay.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Group all events by start date (M/D/YYYY)
    const grouped: Record<string, EventEntry[]> = {};
    for (const event of singleDay) {
      const { start, label } = event;
      const key = shortDate(start);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ start, label });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Upcoming Events — Next ${DEFAULT_DAYS} Days`)
      .setColor(0x5865f2);
    const dateKeys = Object.keys(grouped).sort(
      (a, b) => grouped[a][0].start.getTime() - grouped[b][0].start.getTime(),
    );
    const channelMention = `<#${Environment.eventsChannelId}>`;
    embed.setTitle("Upcoming events:");
    embed.setDescription(`See ${channelMention} for more information`);
    embed.setFooter({
      text: "Dates may be incorrectly parsed - check event threads to confirm",
    });

    // Add single-day events as fields
    if (dateKeys.length === 0) {
      embed.addFields({
        name: "No upcoming events",
        value: `go post in ${channelMention}`,
        inline: false,
      });
    } else {
      dateKeys.forEach((date) => {
        const events = grouped[date];
        const lines = events.map((e) => e.label);
        embed.addFields({
          name: date,
          value: lines.join("\n"),
          inline: false,
        });
      });
    }

    // Add multiday events as a single field
    const multiDayFormatted = multiDay
      .map(({ start, end, label }) => {
        if (!end) return "";
        return `**${shortDate(start)}-${shortDate(end)}**: ${label}`;
      })
      .filter(Boolean);
    if (multiDayFormatted.length > 0) {
      embed.addFields({
        name: "Multiday events",
        value: multiDayFormatted.join("\n"),
        inline: false,
      });
    }
    await interaction.editReply({ embeds: [embed] });
  },
});
