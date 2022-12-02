export default interface ISeabotConfig {
    userVoiceChannels: {
        groupId: string;
        triggerChannelId: string;
    };
    autoDeleteMessagesInChannels: Array<{ id: string; frequency: number }> | undefined;
    telemetryChannels: Array<string> | undefined;
    channelIds: { [key: string]: string } | undefined;
    roleIds: {
        moderator: string;
        everyone: string;
        premium: string;
    };
}
