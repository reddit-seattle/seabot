import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

export default new SlashCommand({
  name: "ping",
  description: "Make sure the bot is awake",
  execute: (interaction) => interaction.reply("pong!"),
  builder: new SlashCommandBuilder(),
});
