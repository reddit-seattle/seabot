import { EmbedBuilder, TextChannel, MessageFlags, ChatInputCommandInteraction } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { REGEX } from "../../../utils/constants";
import { buildModActionRow } from "../../../utils/helpers";
import { configuration } from "../../../server";

export default new SlashCommand({
  name: "report",
  description: "Submit a report to the mod team. " +
    "Please include as many details as possible to share context.",
  help: "Submit a report to the mod team",
  builder: new ChatInputCommandBuilder()
    // anon is required, note is required
    .addBooleanOptions([
      (o) => o.setName("anon").setDescription("Anonymous report").setRequired(true)
    ])
    .addStringOptions([
      (o) =>
        o
          .setName("note")
          .setDescription("Please explain the issue")
          .setRequired(true),
      (o) => o.setName("message").setDescription("Message link to content")
    ])
    // user and channel are optional
    .addUserOptions([
      (o) => o.setName("user").setDescription("The user you want to report")
    ])
    .addChannelOptions([
      (o) =>
        o
          .setName("channel")
          .setDescription("The channel where the issue occurred")
    ])
    // evidence not required
    .addAttachmentOptions([
      (o) => o.setName("evidence").setDescription("Attach evidence if necessary")
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
    const evidence = options.getAttachment("evidence");
    const message = options.getString("message");
    const messageLink = message?.match(REGEX.URL)?.[0] ?? null;

    const modReportsChannelId = configuration.channelIds?.["MOD_REPORTS"];
    if (!modReportsChannelId) {
      await interaction.editReply("Mod reports channel is not configured. Please contact an administrator.");
      return;
    }
    const modReports = (await interaction.guild?.channels.cache
      .get(modReportsChannelId)
      ?.fetch()) as TextChannel;
    const timestamp = Math.floor(Date.now() / 1000);
    const reportEmbed = new EmbedBuilder({
      color: 0xff0000,
      title: "New User Report",
      description: `${anon ? "An anonymous user" : username
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

    // Only add image if evidence exists and has a valid URL
    if (evidence?.url) {
      reportEmbed.setImage(evidence.url);
    }
    const modActionRow = buildModActionRow(interaction.guild?.id ?? "", {
      anon,
      user: user ?? undefined,
      channel: channel as TextChannel ?? undefined,
      messageLink: messageLink ?? undefined,
    });

    await modReports.send({
      embeds: [reportEmbed],
      components: [modActionRow],
    });

    await interaction.editReply({
      content: `Thank you for submitting a report ${anon ? "anonymously" : "as <@" + interaction.user.id + ">"}. ` +
        "If your report was not anonymous, a moderator may reach out if they require any further information, " +
        "so please keep an eye on your DMs / Message Requests."
    });
  },
});
