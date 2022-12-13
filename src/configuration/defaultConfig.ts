import ISeabotConfig from "./ISeabotConfig";

const defaultConfig: ISeabotConfig = {
  userVoiceChannels: {
    groupId: "",
    triggerChannelId: "",
  },
  autoDeleteMessages: undefined,
  telemetry: {
    channels: undefined,
    categories: undefined,
  },
  channelIds: undefined,
  roleIds: {
    moderator: "",
    everyone: "",
    premium: "",
  },
};

export default defaultConfig;
