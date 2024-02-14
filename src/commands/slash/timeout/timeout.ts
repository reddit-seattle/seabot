import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import SlashCommand from "../SlashCommand";

const MAX_TIMEOUT_IN_MINUTES = 60 * 4; // 4 hours

const MINUTES = "M";
const HOURS = "H";

export default new SlashCommand({
  name: "time-me-out",
  description: "take a timeout",
  builder: new SlashCommandBuilder()
    .setName("time-me-out")
    .setDescription("take a timeout")
    .addIntegerOption((opt) =>
      opt.setName("amount").setRequired(true).setDescription("how many")
    )
    .addStringOption((opt) =>
      opt
        .setName("unit")
        .setRequired(true)
        .setDescription("hours / minutes")
        .setChoices(
          { name: "hours", value: HOURS },
          { name: "minutes", value: MINUTES }
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const { options, channel } = interaction;
    const member = interaction.member as GuildMember;

    // ephemeral response (private)
    await interaction.deferReply({ ephemeral: true });

    // get inputs
    const timeoutAmount = options.getInteger("amount", true);
    const timeoutUnit = options.getString("unit", true);

    // do a lil math
    const timeoutInMinutes = timeoutAmount * (timeoutUnit == HOURS ? 60 : 1);

    // do a lil logic
    if (timeoutInMinutes <= 0 || timeoutInMinutes > MAX_TIMEOUT_IN_MINUTES) {
      await interaction.followUp(
        "sorry that's too long, go touch grass on your own instead"
      );
    } else {
      // more math
      const timeoutMilliseconds = timeoutInMinutes * 60 * 1000;

      // timeout
      await member.timeout(timeoutMilliseconds, "self-inflicted");

      // tell the user
      await interaction.followUp(
        "Enjoy the timeout, message a mod if you need help."
      );

      // let everyone else know
      await channel?.send(`${member.displayName} has taken a timeout`);
    }
  },
});
