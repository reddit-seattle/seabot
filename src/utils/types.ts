import { VoiceState, Interaction, CacheType, Message, MessageReaction, User, GuildMember } from "discord.js";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionType<T> = (...args: any[]) => T;
export type VoiceStateHandler = (oldState: VoiceState, newState: VoiceState) => void;
export type InteractionHandler = (interaction: Interaction<CacheType>) => Promise<void>;
export type MessageContentHandler = (message: Message) => Promise<void>;
export type ReactionHandler = (reaction: MessageReaction, user: User) => Promise<void>;
export type UserActionHandler = (member: GuildMember) => Promise<void>;
export type EventHandlerFunction = VoiceStateHandler | InteractionHandler | MessageContentHandler | ReactionHandler | UserActionHandler;