import SlashCommand from "./SlashCommand";
import databaseCommands from "./database";
import helpCommands from "./help";
import mtgCommands from "./mtg";
import reportCommands from "./report";
import rjCommands from "./rj";
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import redditCommands from "./reddit";
import modCommands from "./mod";
import timeoutCommands from "./timeout"

const commands: SlashCommand[] = [
  ...databaseCommands,
  ...helpCommands,
  ...mtgCommands,
  ...reportCommands,
  ...rjCommands,
  ...roleCommands,
  ...utilityCommands,
  ...weatherCommands,
  ...redditCommands,
  ...modCommands,
  ...timeoutCommands,
];

export default commands;
