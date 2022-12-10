import contentCommands from "./messageContent";
import reactionCommands from "./reaction";
import slashCommands from "./slash";

const commands = {
  content: contentCommands,
  reaction: reactionCommands,
  slash: slashCommands,
};

export default commands;
