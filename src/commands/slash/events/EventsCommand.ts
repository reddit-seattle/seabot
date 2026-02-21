import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Environment } from "../../../utils/constants";
import parseEventDates from "../../../utils/eventDateParser";
import SlashCommand from "../SlashCommand";

const DEFAULT_DAYS = 7;
const MAX_TITLE_LENGTH = 50;

function shortDate(date: Date): string {
  // Returns M/D/YYYY
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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

    // fetch via client in case the channel is in a different guild (avoid GuildChannelUnowned)
    const channel = await guild.client.channels
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

    const singleDay: { label: string; start: Date; time: string | null }[] = [];
    const multiDay: {
      label: string;
      start: Date;
      end: Date;
      time: string | null;
    }[] = [];

    for (const thread of allThreads) {
      const { name, url } = thread;
      const dates = parseEventDates(name);
      if (!dates || !dates.startdate) continue; // Skip if no valid start date

      const { startdate, enddate, displayTime } = dates;
      // Truncate event title if too long
      let truncatedTitle = name;
      if (truncatedTitle.length > MAX_TITLE_LENGTH) {
        truncatedTitle = truncatedTitle.slice(0, MAX_TITLE_LENGTH - 3) + "...";
      }
      const link = `[${truncatedTitle}](${url})`;

      // Calculate the end of the event's start day
      const endOfStartDay = new Date(startdate);
      endOfStartDay.setHours(23, 59, 59, 999);

      if (enddate) {
        // Multi-day: include if the event overlaps with the window
        const endOfEndDay = new Date(enddate);
        endOfEndDay.setHours(23, 59, 59, 999);
        if (startdate <= windowEnd && endOfEndDay >= now) {
          multiDay.push({
            label: link,
            start: startdate,
            end: enddate,
            time: displayTime
              ? startdate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
          });
        }
      } else {
        // Single-day: include if the event's day has not completely passed and is within the window
        if (endOfStartDay >= now && startdate <= windowEnd) {
          singleDay.push({
            label: link,
            start: startdate,
            time: displayTime
              ? startdate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
          });
        }
      }
    }

    singleDay.sort((a, b) => a.start.getTime() - b.start.getTime());
    multiDay.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Group all events by start date (M/D/YYYY)
    const grouped: Record<
      string,
      Array<{
        time: string | null;
        label: string;
        isMulti: boolean;
        end?: Date;
      }>
    > = {};
    for (const event of singleDay) {
      const { start, label, time } = event;
      const key = shortDate(start);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ time, label, isMulti: false });
    }
    for (const event of multiDay) {
      const { start, end, time, label } = event;
      const key = shortDate(start);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        time,
        label,
        isMulti: true,
        end,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Upcoming Events — Next ${DEFAULT_DAYS} Days`)
      .setColor(0x5865f2);

    let embedDescription = "";

    const dateKeys = Object.keys(grouped).sort((a, b) => {
      const [am, ad, ay] = a.split("/").map(Number);
      const [bm, bd, by] = b.split("/").map(Number);
      return (
        new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
      );
    });

    if (dateKeys.length === 0) {
      embedDescription = "No upcoming events found for this time period.";
    } else {
      embedDescription = dateKeys
        .map((date) => {
          const events = grouped[date];
          const lines = events.map((e) => {
            if (e.isMulti && e.end) {
              // Show range for multi-day
              return `Multi-day: ${shortDate(e.end)} — ${e.label}`;
            }
            return e.label;
          });
          return `**${date}**\n${lines.join("\n")}`;
        })
        .join("\n\n");
    }
    const channelMention = `<#${Environment.eventsChannelId}>`;

    embed.setDescription(
      `${embedDescription}\n\nCheck ${channelMention} for more things to do!`,
    );
    await interaction.editReply({ embeds: [embed] });
  },
});
