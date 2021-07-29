import { VoiceState } from "discord.js";
import { ChannelIds, Environment, VoiceConstants } from "../utils/constants";

const { Permissions } = VoiceConstants;

export const handleVoiceStatusUpdate = (oldState: VoiceState, newState: VoiceState) => {

    // check for bot
    if (oldState?.member?.user?.bot) return;

    // if user has joined the test channel, do the thing
    if (newState?.member?.voice?.channel?.id == ChannelIds.VOICE_CREATE) {
        createVoiceChannelForMember(newState);
    }
    // if user has left a channel (no newstate.voiceChannel), delete it if it's empty
    if (
        (
            //leaving voice (disconnect)
            !newState.member?.voice?.channel || // or
            //switching channel
            newState?.channelID != oldState?.channelID
        ) &&
        //and you're not leaving the initial join channel
        oldState?.channel?.id != ChannelIds.VOICE_CREATE &&
        //and you ARE leaving a channel in the group
        oldState?.channel?.parent?.id == ChannelIds.USER_VOICE_GROUP
    ) {
        // THEN delete the old channel
        deleteEmptyMemberVoiceChannel(oldState)
    }
}

export const createVoiceChannelForMember = (state: VoiceState) => {
    const { guild } = state;
    if (!state?.member?.user || !state?.member?.user.id) {
        return;
    }
    const user = guild.member(state.member?.user!);
    const user_channel_name = `${user?.nickname ?? user?.user.username}'s voice chat`;
    const category_channel = guild.channels.cache.find(channel => channel.id === ChannelIds.USER_VOICE_GROUP);
    // find channel group
    if (category_channel) {

        //TODO: if the user's channel already exists, just put them in that and prevent deletion
        // create channel for user
        guild.channels.create(user_channel_name, {
            //voice channel
            type: VoiceConstants.VOICE_TYPE,
            //parent category
            parent: category_channel.id,
            //permissions
            permissionOverwrites: [
                //allow user to move members out of this channel
                //note: MANAGE_CHANNELS as a permission overwrite on a single channel doesn't extend to the entire guild
                {
                    id: user?.id!,
                    allow: [
                        Permissions.MOVE,
                        Permissions.MUTE,
                        Permissions.DEAFEN,
                        Permissions.MANAGE_CHANNELS
                    ]
                }
            ]
        }).then(channel => {
            // add user to channel
            state?.member?.voice?.setChannel(channel);
        });
    }
};

export const deleteEmptyMemberVoiceChannel = (state: VoiceState) => {
    if (state?.channel?.members?.array()?.length == 0 && state?.channel?.parent?.id == ChannelIds.USER_VOICE_GROUP) {
        state?.channel?.delete();
    }
};
