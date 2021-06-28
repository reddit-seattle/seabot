import { GuildMember, PartialGuildMember } from "discord.js";

const FIVE_MINUTES = 1000 * 60 * 5;

export const abeLeaves = (member: GuildMember | PartialGuildMember) => {
    if (Date.now() - member.joinedAt?.getTime()! < FIVE_MINUTES) {
        const { guild } = member;
        guild?.systemChannel?.send('https://media.giphy.com/media/fDO2Nk0ImzvvW/giphy.gif')
    }
}

export const newAccountJoins = (member: GuildMember | PartialGuildMember) => {
    if (Date.now() - member.user!.createdTimestamp < FIVE_MINUTES) {
        member.send(`
            Hey ${member.user!.username} - just a reminder, your account needs to be at least 5 minutes old to chat. 
            While you wait, feel free to browse our welcome channel for some basic rules and channel descriptions.`
        )
    }
}
