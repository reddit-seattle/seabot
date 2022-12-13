import {
  CategoryChannel,
  ChannelType,
  VoiceState,
} from "discord.js";
import { configuration } from "../server";
import { Environment, VoiceConstants } from "../utils/constants";

const { Permissions } = VoiceConstants;

export const handleVoiceStatusUpdate = async (
  oldState: VoiceState,
  newState: VoiceState
) => {
  // check for bot
  if (oldState?.member?.user?.bot) return;

  // if user has joined the test channel, do the thing
  const config = configuration.userVoiceChannels;
  // TODO: REMOVE DEBUG
  Environment.DEBUG && console.dir(config);
  if (newState?.member?.voice?.channel?.id == config?.triggerChannelId) {
    Environment.DEBUG && console.dir("Triggering create voice channel for member");
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
    Environment.DEBUG && console.dir("Triggering deleteEmptyMemberVoiceChannel");
    await deleteEmptyMemberVoiceChannel(oldState);
  }
};

export const createVoiceChannelForMember = async (state: VoiceState) => {
  Environment.DEBUG && console.dir("createVoiceChannelForMember - voiceState (newState):");
  Environment.DEBUG && console.dir(state);
  const { guild } = state;
  if (!state?.member?.user || !state?.member?.user.id) {
    return;
  }
  const config = configuration.userVoiceChannels;
  Environment.DEBUG && console.dir("createVoiceChannelForMember - config:");
  Environment.DEBUG && console.dir(config);
  const user = guild.members.cache.get(state?.member?.user?.id);
  const user_channel_name = `${
    user?.nickname ?? user?.user.username
  }'s voice chat`;
  const category_channel = await guild.channels.cache.find(
    (channel) => channel.id === config?.groupId
  ) as CategoryChannel;
  // find channel group
  if (category_channel) {
    Environment.DEBUG && console.dir("Found category channel:");
    Environment.DEBUG && console.dir(category_channel);
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
    Environment.DEBUG && console.dir("Created voice channel:");
    Environment.DEBUG && console.dir(created_channel);
    Environment.DEBUG && console.dir("Moving member to new channel.");
    await state?.member?.voice?.setChannel(created_channel);
  }
};

export const deleteEmptyMemberVoiceChannel = async (state: VoiceState) => {
  const config = configuration.userVoiceChannels;
  Environment.DEBUG && console.dir(config);
  if (
    state?.channel?.members?.size == 0 &&
    state?.channel?.parent?.id == config?.groupId
  ) {
    Environment.DEBUG && console.log("Deleting member channel: " + state?.channel?.name)
    await state?.channel?.delete();
  }
};
