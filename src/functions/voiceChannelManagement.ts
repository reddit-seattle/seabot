import {
  CategoryChannel,
  ChannelType,
  VoiceChannel,
  VoiceState,
} from "discord.js";
import { configuration } from "../server";
import { VoiceConstants } from "../utils/constants";

const { Permissions } = VoiceConstants;

export const handleVoiceStatusUpdate = async (
  oldState: VoiceState,
  newState: VoiceState
) => {
  // check for bot
  if (oldState?.member?.user?.bot) return;

  // if user has joined the test channel, do the thing
  const config = configuration.userVoiceChannels;
  if (newState?.member?.voice?.channel?.id == config?.triggerChannelId) {
    await createVoiceChannelForMember(newState);
  }
  if (
    //leaving voice (disconnect)
    (!newState.member?.voice?.channel || // or
      //switching channel
      newState?.channelId != oldState?.channelId) &&
    //and you're not leaving the initial join channel
    oldState?.channel?.id != config?.triggerChannelId &&
    //and you ARE leaving a channel in the group
    oldState?.channel?.parent?.id == config?.groupId
  ) {
    // THEN delete the old channel
    await deleteEmptyMemberVoiceChannel(oldState);
  }
};

export const createVoiceChannelForMember = async (state: VoiceState) => {
  const { guild } = state;
  if (!state?.member?.user || !state?.member?.user.id) {
    return;
  }
  const config = configuration.userVoiceChannels;
  const user = guild.members.cache.get(state?.member?.user?.id);
  const user_channel_name = `${
    user?.nickname ?? user?.user.username
  }'s voice chat`;
  const category_channel = guild.channels.cache.find(
    (channel) => channel.id === config?.groupId
  ) as CategoryChannel;
  // find channel group
  if (category_channel) {
    //TODO: if the user's channel already exists, just put them in that and prevent deletion
    // create channel for user
    const created_channel = await category_channel.children.create({
      name: user_channel_name,
      //voice channel
      type: ChannelType.GuildVoice,
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
            Permissions.MANAGE_CHANNELS,
          ],
        },
      ],
    });
    await state?.member?.voice?.setChannel(created_channel);
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
