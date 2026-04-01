import SlashCommand from "./SlashCommand";
import databaseCommands from "./database";
import eventsCommands from "./events";
import helpCommands from "./help";
import reportCommands from "./report";
import rjCommands from "./rj";
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import redditCommands from "./reddit";
import modCommands from "./mod";
import timeoutCommands from "./timeout";
import camCommands from "./cam";
import quoteCommands from "./quote";

const commands: SlashCommand[] = [
  ...databaseCommands,
  ...eventsCommands,
  ...helpCommands,
  ...reportCommands,
  ...rjCommands,
  ...roleCommands,
  ...utilityCommands,
  ...weatherCommands,
  ...redditCommands,
  ...modCommands,
  ...timeoutCommands,
  ...camCommands,
  ...quoteCommands,
];

export default commands;
