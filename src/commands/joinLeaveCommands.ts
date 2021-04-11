import { GuildMember, PartialGuildMember } from "discord.js";

export const abeLeaves = (member: GuildMember | PartialGuildMember) => {
    if (((new Date()).getTime() - member.joinedAt?.getTime()!) < 1000 * 60 * 5) {
        const { guild } = member;
        guild?.systemChannel?.send('https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif')
    }
}