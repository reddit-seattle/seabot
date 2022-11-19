import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";

import { Telemetry as TelemetryModel } from "../../../models/DBModels";
import { Database } from "../../../utils/constants";
import { DatabaseCommand } from "./DatabaseCommand";

export default new DatabaseCommand<TelemetryModel>(Database.Containers.TELEMETRY, {
    name: "channelstats",
    description: "Get Channel Telemetry Info",
    help: "channelstats",
    slashCommandDescription: getCommandDescription,
    executeSlashCommand: getCommandHandler,
});

function getCommandDescription(this: DatabaseCommand<TelemetryModel>) {
    return new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultPermission(false)
        .addChannelOption((opt) =>
            opt.setName("channel").setDescription("channel to get telemetry for").setRequired(true)
        );
}

async function getCommandHandler(this: DatabaseCommand<TelemetryModel>, interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel("channel", true);
    const { id: cat } = channel;
    const results = await this.connector.find(Database.Queries.TELEMETRY_BY_CHANNEL(cat));

    const embed = new EmbedBuilder().setTitle(`Message telemetry for ${channel.name}`).setFields(
        results
            ? results.map((telemetry: any) => {
                  return {
                      name: moment.utc(telemetry.Window_End_Time).format("YYYY-MM-DD : HH:mm"),
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
