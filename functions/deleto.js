
const constants = require('../utils/constants');
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
