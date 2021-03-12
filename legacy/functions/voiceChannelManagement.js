
const groupName = 'user-voice-channels'
const VOICE_TYPE = 'voice';

module.exports.createVoiceChannelForMember = (state) => {
    const { guild } = state;
    const { user } = state.member;
    user_channel_name = `${user.username}'s voice chat`;
    const category_channel = guild.channels.cache.find(channel => channel.name === groupName);
    // find channel group
    if (category_channel) {

        //TODO: if the user's channel already exists, just put them in that and prevent deletion
        // create channel for user
        guild.channels.create(user_channel_name, {
            //voice channel
            type: VOICE_TYPE,
            //parent category
            parent: category_channel.id,
            //permissions
            permissionOverwrites: [
                //allow user to move members out of this channel
                {
                    id: user.id,
                    allow: [
                        'MOVE_MEMBERS',
                        'MUTE_MEMBERS',
                        'DEAFEN_MEMBERS'
                    ]
                }
            ]
        }).then(channel => {
            // add user to channel
            state.member.voice.setChannel(channel);
        });
    }
};

module.exports.deleteEmptyMemberVoiceChannel = (state) => {
    if (state?.channel.members.array().length == 0 && state?.channel?.parent?.name == groupName) {
        state?.channel.delete();
    }
};