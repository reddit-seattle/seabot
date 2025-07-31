import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  name: "ping",
  description: "Make sure the bot is awake",
  execute: (interaction) => interaction.reply("pong!"),
  builder: new ChatInputCommandBuilder()
    .setName("ping")
    .setDescription("Make sure the bot is awake"),
});
