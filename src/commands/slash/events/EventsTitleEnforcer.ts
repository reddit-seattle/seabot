import { Events, ThreadChannel } from "discord.js";
import DiscordEventRouter from "../../../discord/DiscordEventRouter";
import { Environment } from "../../../utils/constants";
import { parseEventDate } from "../../../utils/eventDateParser";

const USER_PLACEHOLDER = "{user}";
const TITLE_WARNING =
  `Thanks for creating an event, ${USER_PLACEHOLDER}!\n` +
  "Please include a date (and optional time) for it in our \`/events list\` command.\n" +
  "Any of these formats should work: `[M/D]`, `[M/D/YYYY]`, `[M/D - M/D]`, `Feb 22`.\n" +
  "See other posts in this channel for examples";

function buildWarning(userId: string): string {
  return TITLE_WARNING.replace(USER_PLACEHOLDER, `<@${userId}>`);
}

async function onThreadCreate(thread: ThreadChannel, newlyCreated: boolean) {
  if (!newlyCreated) return;
  if (thread.parentId !== Environment.eventsChannelId) return;
  if (parseEventDate(thread.name) !== null) return;

  const owner = await thread.fetchOwner();
  if (!owner?.id) return;

  await thread.send(buildWarning(owner.id));
}

export function initEventsTitleEnforcer(eventRouter: DiscordEventRouter) {
  if (!Environment.eventsChannelId) return;
  eventRouter.addEventListener(Events.ThreadCreate, onThreadCreate);
}
