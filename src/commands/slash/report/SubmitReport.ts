import {
  EmbedBuilder,
  TextChannel,
  MessageFlags,
  ChatInputCommandInteraction,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { REGEX } from "../../../utils/constants";
import { buildModActionRow } from "../../../utils/helpers";
import { configuration } from "../../../server";

export default new SlashCommand({
  name: "report",
  description:
    "Report something to the mods. Please include as much detail as you wish to share.",
  help: "Submit a report to the mod team",
  telemetry: false,
  builder: new ChatInputCommandBuilder()
    // anon is required, note is required
    .addBooleanOptions([
      (o) =>
        o.setName("anon").setDescription("Anonymous report").setRequired(true),
    ])
    .addStringOptions([
      (o) =>
        o
          .setName("note")
          .setDescription("Please explain the issue")
          .setRequired(true),
      (o) => o.setName("message").setDescription("Right-click, copy link"),
    ])
    // user and channel are optional
    .addUserOptions([(o) => o.setName("user").setDescription("Specify a user")])
    .addChannelOptions([
      (o) => o.setName("channel").setDescription("Link a channel"),
    ])
    // evidence not required
    .addAttachmentOptions([
      (o) => o.setName("attach").setDescription("Screenshots etc."),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { options } = interaction;
    // only get username if not anonymous.
    const anon = options.getBoolean("anon", true);
    const username = anon ? "anonymous" : interaction.user.username;

    const user = options.getUser("user", false);
    const channel = options.getChannel("channel", false);
    const note = options.getString("note", true);
    const attachment = options.getAttachment("attach");
    const message = options.getString("message", false);
    const messageLink = message?.match(REGEX.URL)?.[0] ?? null;

    const modReportsChannelId = configuration.channelIds?.["MOD_REPORTS"];
    if (!modReportsChannelId) {
      await interaction.editReply(
        "Mod reports channel is not configured. Please contact an administrator.",
      );
      return;
    }
    const modReports = (await interaction.guild?.channels.cache
      .get(modReportsChannelId)
      ?.fetch()) as TextChannel;
    const timestamp = Math.floor(Date.now() / 1000);
    const reportEmbed = new EmbedBuilder({
      color: 0xff0000,
      title: "New Report",
      description: `${
        anon ? "An anonymous user" : username
      } has submitted a report\n<t:${timestamp}:F>\n<t:${timestamp}:R>`,
      fields: [
        {
          name: "Reported by",
          value: anon ? `Anonymous` : `<@${interaction.user.id}>`,
        },
        {
          name: "Channel",
          value: channel?.name ? `<#${channel.id}>` : "n/a",
        },
        {
          name: "User Reported",
          value: user?.id ? `<@${user.id}>` : "n/a",
        },
        {
          name: "Note",
          value: note,
        },
      ],
    });

    // Only add image if attachment exists and has a valid URL
    if (attachment?.url) {
      reportEmbed.setImage(attachment.url);
    }
    const modActionRow = buildModActionRow(interaction.guild?.id ?? "", {
      anon,
      user: user ?? undefined,
      channel: channel instanceof TextChannel ? channel : undefined,
      messageLink: messageLink ?? undefined,
    });

    await modReports.send({
      embeds: [reportEmbed],
      components: [modActionRow],
    });
    const reply = anon
      ? "Thank you for submitting an anonymous report."
      : `Thank you for submitting a report, <@${interaction.user.id}>. ` +
        "Mods may reach out to you privately for more context or details.";

    await interaction.editReply(reply);
  },
});
