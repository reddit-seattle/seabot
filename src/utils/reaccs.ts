import { Message } from "discord.js"
import { any } from "underscore";
import { Emoji, REGEX } from "./constants";
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
    },
    {
        reaction: Emoji.weed,
        searchText: '420',
        trim: true
    },
    {
        reaction: Emoji.downvote,
        searchText: /puya[1il]{1,2}up/ig,
    },
    {
        reaction: Emoji.bruh,
        searchText: 'bruh',
    }
]

export const processMessageReactions = (message: Message) => {
    const content = replaceMentions(message);
    messageReactions.forEach(async reacc => {
        //check regex
        const { reaction, searchText, trim } = reacc;
        if (any([
            typeof searchText === 'string' && stringMatch(content, searchText, trim),
            searchText instanceof RegExp && content.match(searchText),
            searchText instanceof Array && searchText.some(text => stringMatch(content, text, trim))
        ])) {
            await message.react(reaction);
        }

    });
}

export const stringMatch = (content: string, searchText: string, trim?: boolean, enableLinks?: boolean) => {
    searchText = searchText.toLowerCase();
    content = content.toLowerCase();
    if (trim) {
        searchText = searchText.replace(/\s+/g, '');
        content = content.replace(/\s+/g, '');
    }
    if (!enableLinks) {
        content = content.replace(REGEX.URL, '');
    }
    return content.indexOf(searchText) > -1;
}
