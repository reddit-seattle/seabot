import {CacheType, GuildMember, Interaction, Message, MessageReaction, User, VoiceState} from "discord.js";


export type VoiceStateHandler = (oldState: VoiceState, newState: VoiceState) => void;
export type InteractionHandler = (interaction: Interaction<CacheType>) => Promise<void>;
export type MessageContentHandler = (message: Message) => Promise<void>;
export type ReactionHandler = (reaction: MessageReaction, user: User) => Promise<void>;
export type UserActionHandler = (member: GuildMember) => Promise<void>;
export type EventHandlerFunction = VoiceStateHandler | InteractionHandler | MessageContentHandler | ReactionHandler | UserActionHandler;
