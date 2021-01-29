
const constants = require('../utils/constants');
module.exports.delete = async (message) => {
    try{
    tenPrev = await message.channel.messages.fetch({before: message.id, limit: 11});
    if(tenPrev.size < 11) {
        return;
    }
    last = tenPrev.array()[tenPrev.size-1];
    prev = (await message.channel.messages.fetch({before: last.id, limit:50}));
    message.channel.bulkDelete(prev.array(), true);
    }
    catch(e){
        console.dir(e);
    }

};
