import { Message } from "discord.js"
import { isArray } from "underscore";
import { Emoji } from "./constants";
export type MessageReaction = {
    reaction: string;
    searchText: string | string[] | RegExp;
    trim?: boolean;
};

const messageReactions: MessageReaction[] = [
    {
        reaction: '🚪',
        searchText: 'hodor',
        trim: false
    },
    {
        reaction: Emoji.bisbopt,
        searchText: 'bisbopt'
    }
]

export const processMessageReactions = (message: Message) => {
    const {content} = message;
    messageReactions.forEach(async reacc => {
        //check regex
        const {reaction, searchText, trim} = reacc;
        if(searchText instanceof RegExp) {
            if(content.match(searchText)) {
                await message.react(reaction);
            }
        }
        else {
            //assume string search check array
            if (isArray(searchText)) {
                searchText.forEach(async q => {
                    if(stringMatch(content, q, trim)) {
                        await message.react(reaction);
                    }
                })
            }
            else {
                //literal string match
                if(stringMatch(content, searchText, trim)) {
                    await message.react(reaction);
                }
            }
        }
    })
}

export const stringMatch =(content:string, searchText: string, trim?: boolean) => {
    if(trim) {
        const query = searchText.trim().replace(' ', '').toLowerCase();
        const trimmedContent = content.trim().replace(' ', '').toLowerCase();
        if(trimmedContent.indexOf(query) > -1) {
            return true;
        }
    }
    else {
        if(content.indexOf(searchText) > -1) {
            return true;
        }
    }

}