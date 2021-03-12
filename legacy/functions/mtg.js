const rp = require('request-promise');
const Discord = require('discord.js');
const _ = require('underscore');
const constants = require('../../utils/constants');
const prefix = constants.PREFIX;
const mtg = require('mtgsdk');
module.exports.mtg = (message) => {
    let cardFound = false;
    let hasImage = false;
    let cardNames = {};

    const queryStrings = message.content.split(' ');
    queryStrings.shift();
    const cardName = queryStrings.join(' ');
    const richEmbed = new Discord.MessageEmbed()
        .setTitle(`Card results for ${cardName}`);
    const emitter = mtg.card.all({name:cardName });
    emitter.on('data', card => {
        cardFound = cardFound || card;
        //first card image is shown
        if(!hasImage) {
            richEmbed.setImage(card.imageUrl);
            hasImage = true;
        }
        //really stupid way to avoid duplicates that only differ in sets
        if(!cardNames[card.name]){
            richEmbed.addField(`${card.name}${card.manaCost ? (' ' + card.manaCost) : ''}`, `${card.type} - ${card.text}`, false);
            cardNames[card.name] = true;
        }
    });
    emitter.on('error', console.log);
    emitter.on('end', () => {
        message.channel.send(cardFound ? richEmbed : `No cards found for ${cardName}`);
    });
};
