import { SlashCommandBuilder, EmbedBuilder } from 'discord.js'
import { card, Card } from 'mtgsdk';
import { Command } from '../../../models/Command';

export default new Command({
    description: 'Find MTG cards by name (inclusive, so try to be specific)',
    help: 'mtg cheatyface',
    name: 'mtg',
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName('mtg')
            .setDescription('search for magic cards')
            .addStringOption(option => {
                return option
                    .setName('title')
                    .setDescription('card title to search for')
                    .setRequired(true);
            });
    },
    executeSlashCommand: (interaction) => {
        let cardFound = false;
        let hasImage = false;
        let cardNames: { [id: string]: boolean } = {};


        const cardName = interaction.options.getString('title', true);

        const richEmbed = new EmbedBuilder()
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
                richEmbed.addFields([
                    {
                        name:`${card.name}${card.manaCost ? (' ' + card.manaCost) : ''}`,
                        value:`${card.type} - ${card.text}`,
                        inline: false
                    }
                ])
                cardNames[card.name] = true;
            }
        });
        emitter.on('error', console.log);
        emitter.on('end', () => {
           if(cardFound) {
               interaction.reply({embeds: [richEmbed]});
           }
           else{
                interaction.reply({
                    content: `No cards found for ${cardName}`,
                    ephemeral: true
                });
            }
        });
    }
});

