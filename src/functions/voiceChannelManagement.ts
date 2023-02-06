import {
  CategoryChannel,
  ChannelType,
  VoiceState,
} from "discord.js";
import { configuration } from "../server";
import { Environment, VoiceConstants } from "../utils/constants";
import { joinVoiceChannel,createAudioPlayer, NoSubscriberBehavior, createAudioResource, generateDependencyReport, getVoiceConnection   } from '@discordjs/voice';
import { join } from "path";

const { Permissions } = VoiceConstants;
console.log(generateDependencyReport());

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

  // if user joins hangouts and i'm not there
  let hangouts = '370945003566006276';
  
  // dev
  hangouts = '994014273074372630';

  /**
   * Next steps
   * Connect azure storage blob as file share, find mount URL
   * append users mount URL
   * add custom config entry for audio clips
   * dict{[userid: string]: file_name: string}
   * 
   * logic:
   *  if a premium user joins hangouts
   *    join the channel if i'm not already there
   *    lookup their song
   *    play it
   *  if a premium user leaves hangouts and i'm there
   *    lookup their outro
   *    play it
   *  
   */
 
  const connection = getVoiceConnection(newState.guild.id);
  
  if(newState.channel) {
    const connection = joinVoiceChannel({
      channelId: newState.channel.id,
      guildId: newState.guild.id,
      adapterCreator: newState.guild.voiceAdapterCreator,
    });

    const audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });
    audioPlayer.on('error', error => {
      console.error('Error:', error.message);
    });
    const subscription = connection.subscribe(audioPlayer);

    if (subscription) {

      const resource = createAudioResource(join(__dirname, '../../noise.mp3'));
      resource.playStream.on('error', error => {
        console.error('Error:', error.message);
      });

      audioPlayer.play(resource);
    }
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
  const category_channel = await guild.channels.cache.find(
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
