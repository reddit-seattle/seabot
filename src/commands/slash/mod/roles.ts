import {
  ChatInputCommandInteraction,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import SlashCommand from "../SlashCommand";

// TODO - config / consts
const ASSIGNABLE_ROLES = [
    '884099771286036502', // minor
    '853016973804699689', // IRL
    '1333912863605002271', // politics timeout
    '1388337523012534342', // resident
    '1339007768203366492', // chris fight
    '1388337523012534342', // wnp
];

// users who can't be assigned roles
const IMMUNE_ROLES = [
    '1077756366711697428'
]

export default new SlashCommand({
  name: "role",
  description: "manage roles",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("role")
    .setDescription("manage roles")
    // enable this only for mods
    .setDefaultMemberPermissions('0')
    .addSubcommands([
      (group) =>
        group
          .setName("assign")
          .setDescription("assign a role to a user")
          .addUserOptions([
            (opt) => opt.setName("user").setDescription("User to assign").setRequired(true)
          ])
          .addRoleOptions([
            (opt) => opt.setName("role").setDescription("Role to assign").setRequired(true)
          ])
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const {options} = interaction;
    
    const roleToAssign = options.getRole('role', true)
    const { id } = roleToAssign;
    if (ASSIGNABLE_ROLES.indexOf(id) >= 0) {
        const user = options.getUser('user', true);

        const guildUser = interaction.guild?.members.cache.get(user.id);
        const userRoles = guildUser?.roles.cache.map(x => x.id) ?? [];
        if (!userRoles.some((role) => IMMUNE_ROLES.indexOf(role) >= 0)) {
            await guildUser?.roles.add(id);
            await interaction.followUp(`${user.displayName} has been given the \`${roleToAssign.name}\` role`)
            return;
        }
        // user has a blocking role
        await interaction.followUp(`${user.displayName} cannot be assigned roles with this command.`);
        return;
    }
    await interaction.followUp(`Role \`${roleToAssign.name}\` cannot be assigned with this command.`);
    // this role can't be assigned
    return;
  },
});
