import { Message } from "discord.js"
import { isArray } from "underscore";
import { Emoji } from "./constants";
import { replaceMentions } from "./helpers";
export type MessageReaction = {
    reaction: string;
    searchText: string | string[] | RegExp;
    trim?: boolean;
};

const messageReactions: MessageReaction[] = [
    {
        reaction: '🚪',
        searchText: 'hodor'
    },
    {
        reaction: Emoji.bisbopt,
        searchText: 'bisbopt'
    },
    {
        reaction: '🦆',
        searchText: 'duck'
    },
    {
        reaction: Emoji.nice,
        searchText: '69',
        trim: true
    }
]

export const processMessageReactions = (message: Message) => {
    const content = replaceMentions(message);
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

export const stringMatch = (content:string, searchText: string, trim?: boolean) => {
    searchText = searchText.toLowerCase();
    content = content.toLowerCase();
    if(trim) {
        searchText = searchText.replace(/\s+/g, '');
        content = content.replace(/\s+/g, '');
    }
    return content.indexOf(searchText) > -1;
}
