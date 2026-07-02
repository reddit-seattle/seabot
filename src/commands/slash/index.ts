import SlashCommand from "./SlashCommand";
import databaseCommands from "./database";
import eventsCommands from "./events";
import helpCommands from "./help";
import reportCommands from "./report";
import rjCommands from "./rj";
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import modCommands from "./mod";
import timeoutCommands from "./timeout";
import camCommands from "./cam";
import pinCommands from "./pin";

const commands: SlashCommand[] = [
  ...databaseCommands,
  ...eventsCommands,
  ...helpCommands,
  ...reportCommands,
  ...rjCommands,
  ...roleCommands,
  ...utilityCommands,
  ...weatherCommands,
  ...modCommands,
  ...timeoutCommands,
  ...camCommands,
  ...pinCommands,
];

export default commands;
