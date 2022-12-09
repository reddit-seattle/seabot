import SlashCommand from "./SlashCommand";
import databaseCommands from "./database";
import helpCommands from "./help";
import mtgCommands from "./mtg";
import reportCommands from "./report";
import rjCommands from "./rj";
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import threadCommands from "./threads";

const commands: SlashCommand[] = [
    ...databaseCommands,
    ...helpCommands,
    ...mtgCommands,
    ...reportCommands,
    ...rjCommands,
    ...roleCommands,
    ...utilityCommands,
    ...weatherCommands,
    ...threadCommands
]

export default commands;