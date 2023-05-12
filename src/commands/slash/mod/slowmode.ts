import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import SlashCommand from "../SlashCommand";
import { DiscordAPIError } from "discord.js";

enum slowmodeSubCommands {
  SET = "set",
  CLEAR = "clear",
}

export default new SlashCommand({
  name: "slowmode",
  description: "set slowmode for a channel",
  adminOnly: true,
  builder: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("manage slowmode for a channel")
    .setDefaultMemberPermissions(0) // needs to be enabled for a group
    .addSubcommand((cmd) =>
      cmd
        .setName(slowmodeSubCommands.SET)
        .setDescription("turn on slowmode for a channel")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("channel to slowmode")
            .setRequired(true)
        )
        .addNumberOption((opt) =>
          opt
            .setName("time")
            .setDescription("slowmode time in seconds")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("reason")
            .setDescription("Optional audit log reason for slowmode")
            .setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("hidden")
            .setDescription(
              "Hide bot response with details (default is public)"
            )
            .setRequired(false)
        )
    )
    .addSubcommand((cmd) =>
      cmd
        .setName(slowmodeSubCommands.CLEAR)
        .setDescription(
          "disable slowmode for a channel - equivalent to `set slowmode 0`"
        )
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("channel to slowmode")
            .setRequired(true)
        )
        .addBooleanOption((opt) =>
          opt
            .setName("hidden")
            .setDescription(
              "Hide bot response with details (default is public)"
            )
            .setRequired(false)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const { options } = interaction;
    const subcmd = options.getSubcommand();
    const channel = options.getChannel("channel", true);
    const hidden = options.getBoolean("hidden", false) ?? false;
    await interaction.deferReply({ ephemeral: hidden });
    switch (subcmd) {
      case slowmodeSubCommands.SET:
        const time = options.getNumber("time", true);
        const reason = options.getString("reason", false);
        if (channel instanceof TextChannel) {
          try {
            channel.setRateLimitPerUser(time, reason?.toString());
            interaction.followUp(
              `Slowmode of ${time} seconds set on ${channel.name}${
                reason ? `: ${reason}.` : `.`
              }`
            );
          } catch (e: any) {
            if (e instanceof DiscordAPIError) {
              interaction.followUp(
                "There was an error setting slowmode: " + e.message
              );
            } else {
              interaction.followUp("Unknown error occurred");
            }
          }
        } else {
          interaction.followUp("Cannot slowmode a non-text channel");
        }

        break;
      case slowmodeSubCommands.CLEAR:
        if (channel instanceof TextChannel && channel.rateLimitPerUser > 0) {
          channel.setRateLimitPerUser(0, "Cleared slowmode");
          interaction.followUp(`Cleared slowmode on ${channel.name}.`);
        } else {
          interaction.followUp(
            "Cannot clear slowmode on a non-text channel, or a channel without slowmode enabled."
          );
        }

        break;
      default:
        interaction.followUp("subcommand required");
    }
  },
});
