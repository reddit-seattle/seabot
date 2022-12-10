import { SlashCommandBuilder } from "discord.js";

import SlashCommand from "../SlashCommand";

import { Strings } from "../../../utils/constants";

export default new SlashCommand({
  name: "tea",
  help: "tea",
  description: "ask for tea",
  builder: new SlashCommandBuilder(),
  execute: (interaction) => interaction.reply(Strings.teapot),
});
