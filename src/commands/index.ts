import contentCommands from "./messageContent";
import contextMenuCommands from "./contextMenu";
import reactionCommands from "./reaction";
import slashCommands from "./slash";

const commands = {
  content: contentCommands,
  contextMenu: contextMenuCommands,
  reaction: reactionCommands,
  slash: slashCommands,
};

export default commands;
