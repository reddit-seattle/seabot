import { Duration } from "../utils/Time/Duration";

export type AutoDeleteConfiguration = {
  targetId: string;
  timeBeforeClearing: Duration;
  numberOfMessages?: number;
};

export default interface ISeabotConfig {
  userVoiceChannels?: {
    groupId: string;
    triggerChannelId: string;
  };

  autoDeleteMessages?: {
    channels: Array<AutoDeleteConfiguration>;
    categories: Array<AutoDeleteConfiguration>;
  };

  telemetryCategories?: Array<string>;

  channelIds?: { [key: string]: string };

  roleIds: {
    moderator: string;
    everyone: string;
    premium: string;
  };
}
