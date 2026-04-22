import {
  Client,
  Events,
  GuildMember,
  Message,
  MessageReaction,
  PartialGuildMember,
  PartialMessage,
  PartialMessageReaction,
} from "discord.js";

type HandledEventArgs =
  | GuildMember
  | PartialGuildMember
  | Message
  | PartialMessage
  | MessageReaction
  | PartialMessageReaction;
const eventsToResolve = [
  Events.MessageCreate,
  Events.MessageDelete,
  Events.MessageReactionAdd,
  Events.MessageReactionRemove,
  Events.GuildMemberAdd,
  Events.GuildMemberRemove,
];

export default class DiscordEventRouter {
  private _eventHandlers: Map<Events, Function[]> = new Map();
  private _client: Client;

  constructor(client: Client) {
    this._client = client;
  }

  public addEventListener(event: Events, handler: Function) {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Array<Function>());

      this.registerEventForHandlers(event);
    }

    this._eventHandlers.get(event)?.push(handler);
  }

  public removeEventListener(event: Events, handler: Function) {
    if (!this._eventHandlers.has(event)) {
      return;
    }

    const handlerIndex = (
      this._eventHandlers.get(event) as Array<Function>
    ).indexOf(handler);
    if (handlerIndex > -1) {
      this._eventHandlers.get(event)?.splice(handlerIndex, 1);
    }
  }

  private registerEventForHandlers(eventType: Events) {
    this._client.on(eventType.toString(), (...args: any[]) => {
      this.handleEvents(eventType, args).catch((error) => {
        console.error(`Error handling event ${eventType}:`, error);
      });
    });
  }

  private async handleEvents(eventType: Events, eventArgs: any) {
    const handlers = this._eventHandlers.get(eventType);
    if (!handlers) return;

    eventArgs = await this.resolvePartialsInArgs(eventType, eventArgs);

    const results = await Promise.allSettled(
      handlers.map((handler) =>
        Promise.resolve().then(() => handler(...eventArgs)),
      ),
    );
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`Event handler for ${eventType} failed:`, result.reason);
      }
    }
  }

  private async resolvePartialsInArgs(
    eventType: Events,
    eventArgs: HandledEventArgs,
  ) {
    type Resolved = Message | MessageReaction | GuildMember;
    let resolvedArgs: Resolved;
    if (eventsToResolve.includes(eventType)) {
      if (eventArgs.partial) {
        resolvedArgs = (await eventArgs.fetch()) as Resolved;
      } else {
        resolvedArgs = eventArgs;
      }

      const argsAsReaction = resolvedArgs as MessageReaction | undefined;
      if (argsAsReaction?.message?.partial) {
        argsAsReaction.message = await argsAsReaction.message.fetch();
      }

      return resolvedArgs;
    }

    return eventArgs;
  }
}
