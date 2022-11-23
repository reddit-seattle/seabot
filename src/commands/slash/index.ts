import databaseCommands from "./database";
import helpCommands from "./help";
import hueCommands from "./hue";
import mtgCommands from "./mtg";
import reportCommands from "./report";
import rjCommands from "./rj";
import roleCommands from "./role";
import utilityCommands from "./utility";
import weatherCommands from "./weather";
import { Command } from "../Command";

const commands: Command[] = [
    ...databaseCommands,
    ...helpCommands,
    ...hueCommands,
    ...mtgCommands,
    ...reportCommands,
    ...rjCommands,
    ...roleCommands,
    ...utilityCommands,
    ...weatherCommands
]

export default commands;