import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import SlashCommand from "../SlashCommand";

const MAX_TIMEOUT = 1000 * 60 * 60 * 4; // 4 hours

export default new SlashCommand({
    name: 'time-me-out',
    description: 'take a timeout',
    builder: new SlashCommandBuilder()
        .setName('time-me-out')
        .setDescription('take a timeout')
        .addIntegerOption(opt => 
            opt.setName('seconds')
                .setDescription('seconds to be timed out for (default 60)')
                .setRequired(false)
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        const {options, channel} = interaction;
        await interaction.deferReply({ephemeral: true});
        const timeoutSeconds = options.getInteger('seconds', false) ?? 60;

        if (timeoutSeconds >= MAX_TIMEOUT) {
            await interaction.followUp("sorry that's too long, go touch grass on your own instead");
        }
        else {
            const timeoutMilliseconds = timeoutSeconds * 1000;
            const member = interaction.member as GuildMember;
            await member.timeout(timeoutMilliseconds);
            await interaction.followUp("enjoy the timeout, message a mod if you need help");
            const { user } = member;
            await channel?.send(`${user.username} has taken a timeout`);
        }
    }
})