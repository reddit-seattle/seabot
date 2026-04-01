import {
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
  PermissionFlagsBits,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import SlashCommand from "../SlashCommand";
import { quoteChannelStore, QuoteChannel } from "../../../db";
import { Environment } from "../../../utils/constants";
import { Logger } from "../../../utils/logger";

enum RandomQuoteSubCommands {
  ENABLE = "enable",
  DISABLE = "disable",
  LIST = "list",
}

export default new SlashCommand({
  name: "randomquote",
  description: "Manage random quote feature for April Fools",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommands([
      (cmd) =>
        cmd
          .setName(RandomQuoteSubCommands.ENABLE)
          .setDescription("Enable random quotes in a channel")
          .addChannelOptions([
            (opt) =>
              opt
                .setName("channel")
                .setDescription("Channel to enable quotes in")
                .setRequired(true),
          ])
          .addNumberOptions([
            (opt) =>
              opt
                .setName("chance")
                .setDescription("Probability of responding (0.01-1.0)")
                .setMinValue(0.01)
                .setMaxValue(1.0)
                .setRequired(true),
          ])
          .addStringOptions([
            (opt) =>
              opt
                .setName("mode")
                .setDescription("Selection mode (random, claude, or gemini)")
                .addChoices(
                  { name: "Random", value: "random" },
                  { name: "Claude", value: "claude" },
                  { name: "Gemini", value: "gemini" },
                )
                .setRequired(false),
          ]),
      (cmd) =>
        cmd
          .setName(RandomQuoteSubCommands.DISABLE)
          .setDescription("Disable random quotes in a channel")
          .addChannelOptions([
            (opt) =>
              opt
                .setName("channel")
                .setDescription("Channel to disable quotes in")
                .setRequired(true),
          ]),
      (cmd) =>
        cmd
          .setName(RandomQuoteSubCommands.LIST)
          .setDescription("List all enabled quote channels"),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const subcommand = interaction.options.getSubcommand();
    const debugChannelId = Environment.quoteDebugChannelId;

    try {
      switch (subcommand) {
        case RandomQuoteSubCommands.ENABLE: {
          const channel = interaction.options.getChannel("channel", true);
          const chance = interaction.options.getNumber("chance", true);
          const mode = (interaction.options.getString("mode") ??
            "random") as "random" | "gemini" | "claude";

          const result = quoteChannelStore.enableChannel(
            channel.id,
            chance,
            mode,
          );

          if (result) {
            await interaction.editReply({
              content: `Enabled random quotes in <#${channel.id}> with ${(
                chance * 100
              ).toFixed(1)}% chance (mode: ${mode})`,
            });

            // Log to debug channel
            if (debugChannelId) {
              try {
                const debugChannel = (await interaction.guild?.channels.fetch(
                  debugChannelId,
                )) as TextChannel | null;
                if (debugChannel?.isTextBased()) {
                  await debugChannel.send(
                    `**Random Quote Enabled**\n` +
                      `Channel: <#${channel.id}>\n` +
                      `Chance: ${(chance * 100).toFixed(1)}%\n` +
                      `Mode: ${mode}\n` +
                      `Admin: <@${interaction.user.id}>`,
                  );
                }
              } catch (e) {
                Logger.warn("Failed to log to debug channel:", e);
              }
            }
          } else {
            await interaction.editReply({
              content: `Failed to enable random quotes locally. Check server logs for database errors.`,
            });
          }
          break;
        }

        case RandomQuoteSubCommands.DISABLE: {
          const channel = interaction.options.getChannel("channel", true);
          const result = quoteChannelStore.disableChannel(channel.id);

          if (result) {
            await interaction.editReply({
              content: `Disabled random quotes in <#${channel.id}>`,
            });

            // Log to debug channel
            if (debugChannelId) {
              try {
                const debugChannel = (await interaction.guild?.channels.fetch(
                  debugChannelId,
                )) as TextChannel | null;
                if (debugChannel?.isTextBased()) {
                  await debugChannel.send(
                    `**Random Quote Disabled**\n` +
                      `Channel: <#${channel.id}>\n` +
                      `Admin: <@${interaction.user.id}>`,
                  );
                }
              } catch (e) {
                Logger.warn("Failed to log to debug channel:", e);
              }
            }
          } else {
            await interaction.editReply({
              content: `Channel was not enabled or failed to disable.`,
            });
          }
          break;
        }

        case RandomQuoteSubCommands.LIST: {
          const channels = quoteChannelStore.getAllChannels();

          if (channels.length === 0) {
            await interaction.editReply({
              content: `No channels have random quotes enabled.`,
            });
          } else {
            const list = channels
              .map(
                (ch: QuoteChannel) =>
                  `• <#${ch.channel_id}> - ${(ch.chance * 100).toFixed(
                    1,
                  )}% chance (${ch.mode})`,
              )
              .join("\n");

            await interaction.editReply({
              content: `**Enabled Quote Channels:**\n${list}`,
            });
          }
          break;
        }
      }
    } catch (e) {
      Logger.error(`Error in randomquote command (${subcommand}):`, e);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: `An error occurred: ${e instanceof Error ? e.message : String(e)}`,
        });
      } else {
        await interaction.reply({
          content: `An error occurred: ${e instanceof Error ? e.message : String(e)}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
});
