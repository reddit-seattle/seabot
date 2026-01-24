import SlashCommand from "./SlashCommand";
import bettingCommands from "./betting";
import databaseCommands from "./database";
import helpCommands from "./help";
import reportCommands from "./report";
// import rjCommands from "./rj"; // TODO
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import redditCommands from "./reddit";
import modCommands from "./mod";
import timeoutCommands from "./timeout";
import camCommands from "./cam";

const commands: SlashCommand[] = [
  ...bettingCommands,
  ...databaseCommands,
  ...helpCommands,
  ...reportCommands,
  // ...rjCommands, // TODO
  ...roleCommands,
  ...utilityCommands,
  ...weatherCommands,
  ...redditCommands,
  ...modCommands,
  ...timeoutCommands,
  ...camCommands,
];

export default commands;
