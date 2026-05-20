import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  GuildChannel,
  MessageFlags,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import SlashCommand from "../SlashCommand";

const RENAMEABLE_CHANNELS: string[] = [
  "370945003566006274",
];

export default new SlashCommand({
  name: "rename",
  description: "rename a channel",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("rename")
    .setDescription("rename a channel")
    .setDefaultMemberPermissions(0)
    .addChannelOptions([
      (opt) =>
        opt
          .setName("channel")
          .setDescription("channel to rename")
          .setRequired(true),
    ])
    .addStringOptions([
      (opt) =>
        opt
          .setName("new-name")
          .setDescription("new name for the channel")
          .setRequired(true),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { options } = interaction;
    const channel = options.getChannel("channel", true);
    const newName = options.getString("new-name", true);

    if (!RENAMEABLE_CHANNELS.includes(channel.id)) {
      await interaction.editReply(
        `<#${channel.id}> is not in the list of renameable channels.`,
      );
      return;
    }

    try {
      const guildChannel = interaction.guild?.channels.cache.get(
        channel.id,
      ) as GuildChannel;
      const oldName = guildChannel.name;
      await guildChannel.setName(newName);
      await interaction.editReply(
        `Renamed \`${oldName}\` to \`${newName}\`.`,
      );
    } catch (e: any) {
      if (e instanceof DiscordAPIError) {
        await interaction.editReply("Error renaming channel: " + e.message);
      } else {
        await interaction.editReply("Unknown error occurred.");
      }
    }
  },
});
