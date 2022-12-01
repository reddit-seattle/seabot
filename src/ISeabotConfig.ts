export default interface ISeabotConfig {
    userVoiceChannels: {
        groupId: string;
        triggerChannelId: string;
    };
    autoDeleteMessagesInChannels: Array<string> | undefined;
    telemetryChannels: Array<string> | undefined;
    channelIds: { [key: string]: string } | undefined;
    roleIds: {
        moderator: string;
        everyone: string;
        premium: string;
    };
}
