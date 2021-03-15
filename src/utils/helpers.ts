import { Message } from "discord.js"
import { Config } from "./constants";

export const GetMessageArgs: (message: Message) => string[] = (message) => {
    return message.content.slice(Config.prefix.length).trim().split(' ');
}

// credit: Typescript documentation, src 
// https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types
export function getProperty<T, K extends keyof T>(o: T, propertyName: K): T[K] {
    return o[propertyName]; // o[propertyName] is of type T[K]
}