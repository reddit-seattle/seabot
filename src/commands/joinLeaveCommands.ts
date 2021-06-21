import { GuildMember, PartialGuildMember } from "discord.js";

export const abeLeaves = (member: GuildMember | PartialGuildMember) => {
    if (((new Date()).getTime() - member.joinedAt?.getTime()!) < 1000 * 60 * 5) {
        const { guild } = member;
        guild?.systemChannel?.send('https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif')
    }
}

export const newAccountJoins = (member: GuildMember | PartialGuildMember) => {
    if(((new Date()).getTime() - member.user!.createdTimestamp) < 1000 * 60 * 5) {
        member.send(`Hey ${member.user!.username} - just a reminder, your account needs to be at least 5 minutes old to chat. While you wait, feel free to browse our welcome channel for some basic rules and channel descriptions.`)
    }
}
