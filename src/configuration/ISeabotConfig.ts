import { Duration } from "../utils/Time/Duration";
import type { AiDetectionConfig } from "../aiDetection/types";

export type AutoDeleteConfiguration = {
  targetId: string;
  timeBeforeClearing: Duration;
  numberOfMessages?: number;
};

export default interface ISeabotConfig {
  aiDetection?: AiDetectionConfig;
  userVoiceChannels?: {
    groupId: string;
    triggerChannelId: string;
  };

  autoDeleteMessages?: {
    channels: Array<AutoDeleteConfiguration>;
  };

  telemetryCategories?: Array<string>;

  trackedRoleIds?: Array<string>;

  channelIds?: { [key: string]: string };

  roleIds: {
    subredditModerator?: string;
    moderator: string;
    everyone: string;
    premium: string;
  };
}
