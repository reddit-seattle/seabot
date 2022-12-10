import commands from "./";
import ContentCommandRouter from "./messageContent/ContentCommandRouter";
import DiscordBot from "../discord/DiscordBot";
import DiscordEventRouter from "../discord/DiscordEventRouter";
import ReactionCommandRouter from "./reaction/ReactionCommandRouter";
import SlashCommandRouter from "./slash/SlashCommandRouter";

export default function createCommandRouters(
  eventRouter: DiscordEventRouter,
  discordBot: DiscordBot
) {
  const routers = [
    new ContentCommandRouter(eventRouter, discordBot, commands.content),
    new ReactionCommandRouter(eventRouter, discordBot, commands.reaction),
    new SlashCommandRouter(eventRouter, discordBot, commands.slash),
  ];

  return routers;
}
