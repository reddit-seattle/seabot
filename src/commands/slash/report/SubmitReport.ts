import { SlashCommandBuilder, EmbedBuilder, TextChannel } from "discord.js";
import { now } from "underscore";

import SlashCommand from "../SlashCommand";

import { REGEX } from "../../../utils/constants";
import { buildModActionRow } from "../../../utils/helpers";
import { configuration } from "../../../server";

export default new SlashCommand({
  name: "report",
  description: "Submit a report to the mod team",
  help: "Submit a report to the mod team",
  builder: new SlashCommandBuilder()
    .setName("report")
    .setDescription("Submit a report to the mod team")
    // anon is required, note is required
    .addBooleanOption((o) =>
      o.setName("anon").setDescription("Submit anonymously").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("note")
        .setDescription("Please explain the issue")
        .setRequired(true)
    )
    // user and channel are optional
    .addUserOption((o) =>
      o.setName("user").setDescription("The user you want to report")
    )
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("The channel where the issue occurred")
    )
    // evidence not required
    .addAttachmentOption((o) =>
      o.setName("evidence").setDescription("Attach evidence if necessary")
    )
    .addStringOption((o) =>
      o.setName("message").setDescription("Message link to content")
    ),
  execute: async (interaction) => {
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

    // we need a user or a channel or message
    if (!(user || channel || messageLink)) {
      await interaction.reply({
        ephemeral: true,
        content:
          "Please include either a user, a channel, or a message link with your report, to help mods track it down.",
      });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const modReports = (await interaction.guild?.channels.cache
      .get(configuration.channelIds?.["MOD_REPORTS"])
      ?.fetch()) as TextChannel;
    const timestamp = Math.floor(now() / 1000);
    const reportEmbed = new EmbedBuilder({
      color: 0xff0000,
      title: "New User Report",
      description: `${
        anon ? "An anonymous user" : username
      } has submitted a report\n<t:${timestamp}:F>\n<t:${timestamp}:R>`,
      fields: [
        // ...(
        //     anon ? [] : [{
        //         name: 'ReplyID',
        //         value: interaction.user.id
        //     }]),
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
      image: {
        height: evidence?.height ?? 0,
        width: evidence?.width ?? 0,
        url: evidence?.url ?? "",
      },
    });
    const modActionRow = buildModActionRow(interaction.guild?.id, {
      anon,
      user: user ?? undefined,
      channel: channel ?? undefined,
      messageLink: messageLink ?? undefined,
    });

    await modReports.send({
      embeds: [reportEmbed],
      components: [modActionRow],
    });

    await interaction.followUp({
      ephemeral: true,
      content: `Thank you for submitting a report.\nIf your report was not anonymous, a moderator may reach out if they require any further information.`,
    });
  },
});
