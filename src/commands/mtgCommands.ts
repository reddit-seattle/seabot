import { Message, MessageEmbed } from 'discord.js'
import { card, Card } from 'mtgsdk';
import { Command } from '../models/Command';

export const MTGCommand: Command = {
    description: 'Find MTG cards by name (inclusive, so try to be specific)',
    help: 'mtg cheatyface',
    name: 'mtg',
    execute: (message: Message, args?: string[]) => {
        let cardFound = false;
        let hasImage = false;
        let cardNames: { [id: string]: boolean } = {};


        const cardName = args?.join(' ');

        if(!cardName) {
            message.channel.send('No card name provided.');
            return;
        }
        const richEmbed = new MessageEmbed()
            .setTitle(`Card results for ${cardName}`);
        const emitter = card.all({ name: cardName });
        emitter.on('data', (card: Card) => {
            cardFound = cardFound || !!card;
            //first card image is shown
            if (!hasImage) {
                richEmbed.setImage(card.imageUrl);
                hasImage = true;
            }
            //really stupid way to avoid duplicates that only differ in sets
            if (!cardNames[card.name]) {
                richEmbed.addField(`${card.name}${card.manaCost ? (' ' + card.manaCost) : ''}`, `${card.type} - ${card.text}`, false);
                cardNames[card.name] = true;
            }
        });
        emitter.on('error', console.log);
        emitter.on('end', () => {
            message.channel.send(cardFound ? {embeds: [richEmbed]} : `No cards found for ${cardName}`);
        });
    }
}

