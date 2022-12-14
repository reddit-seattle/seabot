import { CategoryChannel, ChannelType, VoiceState } from "discord.js";
import { configuration } from "../server";
import { Environment, VoiceConstants } from "../utils/constants";

const { Permissions } = VoiceConstants;

export const handleVoiceStatusUpdate = async (
  oldState: VoiceState,
  newState: VoiceState
) => {
  // check for bot
  if (oldState?.member?.user?.bot) return;

  const config = configuration.userVoiceChannels;
  if (newState?.member?.voice?.channel?.id == config?.triggerChannelId) {
    await createVoiceChannelForMember(newState);
  }
  if (
    //leaving voice (disconnect)
    (!newState.member?.voice?.channel || // or
      //switching channel
      newState?.channelId != oldState?.channelId) &&
    oldState?.channel?.id != config?.triggerChannelId &&
    oldState?.channel?.parent?.id == config?.groupId
  ) {
    await deleteEmptyMemberVoiceChannel(oldState);
  }
};

export const createVoiceChannelForMember = (state: VoiceState) => {
  const { guild } = state;
  if (!state?.member?.user || !state?.member?.user.id) {
    return;
  }
  const user = guild.members.cache.get(state?.member?.user?.id);
  if (!user?.id) {
    return;
  }
  const user_channel_name = `${
    user?.nickname ?? user?.user.username
  }'s voice chat`;
  const category_channel = guild.channels.cache.find(
    (channel) => channel.id === configuration.userVoiceChannels?.groupId
  );
  // find channel group
  if (category_channel) {
    //TODO: if the user's channel already exists, just put them in that and prevent deletion
    // create channel for user
    guild.channels
      .create({
        name: user_channel_name,
        //voice channel
        type: VoiceConstants.VOICE_TYPE,
        //parent category
        parent: category_channel.id,
        //permissions
        permissionOverwrites: [
          //allow user to move members out of this channel
          //note: MANAGE_CHANNELS as a permission overwrite on a single channel doesn't extend to the entire guild
          {
            id: user?.id,
            allow: [
              Permissions.MOVE,
              Permissions.MUTE,
              Permissions.DEAFEN,
              Permissions.MANAGE_CHANNELS,
            ],
          },
        ],
      })
      .then((channel) => {
        // add user to channel
        state?.member?.voice?.setChannel(channel as unknown as VoiceChannel);
      });
  }
};

export const deleteEmptyMemberVoiceChannel = async (state: VoiceState) => {
  const config = configuration.userVoiceChannels;
  if (
    state?.channel?.members?.size == 0 &&
    state?.channel?.parent?.id == config?.groupId
  ) {
    await state?.channel?.delete();
  }
};
