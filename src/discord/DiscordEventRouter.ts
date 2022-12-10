import {AllowedPartial, Client, ClientEvents, Events, Partialize, PartialMessage, Partials,} from "discord.js";
import {Awaitable} from "@discordjs/util";

const eventsToResolve = [
  Events.MessageCreate,
  Events.MessageDelete,
  Events.MessageReactionAdd,
  Events.MessageReactionRemove,
  Events.GuildMemberAdd,
  Events.GuildMemberRemove,
];

export interface EventResolutions  {
    [Events.MessageCreate]: ((...args: ClientEvents[Events.MessageCreate] ) => Awaitable<void>)[]
    [Events.MessageDelete]: ((...args: ClientEvents[Events.MessageDelete] ) => Awaitable<void>)[]
    [Events.MessageReactionAdd]: ((...args: ClientEvents[Events.MessageReactionAdd]) => Awaitable<void>)[]
    [Events.MessageReactionRemove]: ((...args: ClientEvents[Events.MessageReactionRemove]) => Awaitable<void>)[]
    [Events.GuildMemberAdd]: ((...args: ClientEvents[Events.GuildMemberAdd]) => Awaitable<void>)[]
    [Events.GuildMemberRemove]: ((...args: ClientEvents[Events.GuildMemberRemove]) => Awaitable<void>)[],
    [Events.InteractionCreate]: ((...args: ClientEvents[Events.InteractionCreate]) => Awaitable<void>)[],
    [Events.VoiceStateUpdate]: ((...args: ClientEvents[Events.VoiceStateUpdate]) => Awaitable<void>)[],
    [Events.ClientReady]: ((...args: ClientEvents[Events.ClientReady]) => Awaitable<void>)[],
    [Events.GuildMemberRemove]: ((...args: ClientEvents[Events.GuildMemberRemove]) => Awaitable<void>)[],
}



type DePartialize<T extends unknown[]> = Exclude<T extends [] ? [] :
        T extends [infer H, ...infer R] ?
        H extends Partialize<AllowedPartial> ? DePartialize<R> : [H, ...DePartialize<R>] : T, []>

export default class DiscordEventRouter {

    private _eventHandlers2 : EventResolutions= {
        [Events.MessageCreate]: [],
        [Events.MessageDelete]: [],
        [Events.MessageReactionAdd]: [],
        [Events.MessageReactionRemove]: [],
        [Events.GuildMemberAdd]: [],
        [Events.GuildMemberRemove]: [],
        [Events.InteractionCreate]: [],
        [Events.VoiceStateUpdate]: [],
        [Events.ClientReady]: [],
        [Events.GuildMemberRemove]: [],

    }
    private _client: Client;

    constructor(client: Client) {
        this._client = client;
    }

    public async addEventListener<T extends keyof EventResolutions>(event: T, handler:  (...args: (DePartialize<Parameters<EventResolutions[T][number]>>)) => ReturnType<EventResolutions[T][number]> ) {
        if (!this._eventHandlers2[event].length) {
            await this.registerEventForHandlers(event);
        }

        (this._eventHandlers2[event] as EventResolutions[T][number][]).push(handler as unknown as EventResolutions[T][number]);
    }



    private async registerEventForHandlers(eventType: keyof EventResolutions)  {
        this._client.on(eventType.toString(), async (...args)=> {
            await this.handleEvents(eventType, (args as ClientEvents[typeof eventType]));
        });

    }
  }

    private async handleEvents<K extends keyof EventResolutions>(eventType: K, eventArgs: Parameters<EventResolutions[K][number]>) {
        const handlers = this._eventHandlers2[eventType];
        if (!handlers) return;
        const partialResolvedEventArgs = await this.resolvePartialsInArgs<K>(eventType, eventArgs);
        handlers.map((handler) => (handler as (...args: Parameters<typeof handler>) => Awaitable<void>)(...partialResolvedEventArgs))
    }

    private async resolvePartialsInArgs<K extends keyof EventResolutions>(
        eventType: K,
        eventArgs: Parameters<EventResolutions[K][number]>
    )  {
        return await Promise.all(eventArgs.map(async (eventArg) => {
            if (eventsToResolve.includes(eventType)) {
                let resolvedArg: typeof eventArg;

                if ('partial' in eventArg && eventArg.partial) {
                    resolvedArg = (await eventArg.fetch()) ;
                } else {
                    resolvedArg = eventArg;
                }
                if ('message' in eventArg){
                    if (eventArg?.message?.partial) {
                        eventArg.message = await eventArg.message.fetch();
                        resolvedArg = eventArg;
                    }
                }
                return resolvedArg;
            }

        })) as Parameters<EventResolutions[K][number]>
    }
  }

  private async resolvePartialsInArgs(
    eventType: Events,
    eventArgs: HandledEventArgs
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
