
const constants = require('../../utils/constants');
const _ = require('underscore');

module.exports.delete = async (message) => {
    try{
    msgs = await message.channel.messages.fetch({before: message.id, limit: 11});
    if(msgs.size < 11) {
        return;
    }
    msg = msgs.array()[10];
    previous = (await message.channel.messages.fetch({before: msg.id, limit:50}));
    message.channel.bulkDelete(previous.array(), true);
    }
    catch(e){
        console.dir(e);
    }

};

module.exports.deleteOldMessages = async (client) => {
    _.each(client.guilds.cache.array(), async (guild) => {
        const rantChannel = guild.channels.cache.find(ch => ch.name == 'rant');
        last = await rantChannel.messages.fetch({limit: 1});
        if(!last.array()?.[0]) {
            return;
        }
        msg = last.array()[0];
        hours_since = (new Date() - msg.createdAt) / 1000 / 60 / 60;
        if(hours_since > 1){
            //last message is over an hour old, kill it all
            previous = (await rantChannel.messages.fetch({limit:50}));
            rantChannel.bulkDelete(previous.array(), true);
            // rantChannel.send('Messages here will be deleted as new messages are typed. The channel will be cleared if no messages are sent within one hour.');

        }
    });
}
