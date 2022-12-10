import moment from "moment";
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { Telemetry as TelemetryModel } from "../../../models/DBModels";
import { Database } from "../../../utils/constants";
import { DatabaseCommand } from "./DatabaseCommand";

const name = "channelstats";
const description = "Get Channel Telemetry Info";

export default new DatabaseCommand<TelemetryModel>(
  Database.Containers.TELEMETRY,
  {
    name,
    description,
    help: "channelstats",
    builder: new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("channel to get telemetry for")
          .setRequired(true)
      ),
    execute: handler,
  }
);

async function handler(
  this: DatabaseCommand<TelemetryModel>,
  interaction: ChatInputCommandInteraction
) {
  await interaction.deferReply();
  const channel = interaction.options.getChannel("channel", true);
  const { id: cat } = channel;
  const results = await this.connector.find(
    Database.Queries.TELEMETRY_BY_CHANNEL(cat)
  );

  const embed = new EmbedBuilder()
    .setTitle(`Message telemetry for ${channel.name}`)
    .setFields(
      results
        ? results.map((telemetry: any) => {
            return {
              name: moment
                .utc(telemetry.Window_End_Time)
                .format("YYYY-MM-DD : HH:mm"),
              value: `Messages: ${telemetry.COUNT_channelId}`,
            };
          })
        : [
            {
              name: "No messages found",
              value: "☹️",
            },
          ]
    );
  await interaction.followUp({ embeds: [embed] });
}
