import { Message } from "discord.js";

export default interface MessageResponse {
    trigger: string | RegExp,
    handler: (message: Message) => void;
}