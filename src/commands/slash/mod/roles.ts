import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import SlashCommand from "../SlashCommand";
import { any } from "underscore";

// roles that can be assigned
const ASSIGNABLE_ROLES = [
    '884099771286036502',
    '853016973804699689'
];

// users who can't be assigned roles
const IMMUNE_ROLES = [
    '1077756366711697428'
]

export default new SlashCommand({
  name: "role",
  description: "manage roles",
  adminOnly: true,
  builder: new SlashCommandBuilder()
    .setName("role")
    .setDescription("manage roles")
    // enable this only for mods
    .setDefaultMemberPermissions('0')
    .addSubcommand((group) =>
      group
        .setName("assign")
        .setDescription("assign a role to a user")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("User to assign").setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName("role").setDescription("Role to assign").setRequired(true)
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const {options} = interaction;
    
    const roleToAssign = options.getRole('role', true)
    const { id } = roleToAssign;
    if (ASSIGNABLE_ROLES.indexOf(id) >= 0) {
        const user = options.getUser('user', true);

        const guildUser = interaction.guild?.members.cache.get(user.id);
        const userRoles = guildUser?.roles.cache.map(x => x.id) ?? [];
        if (!any(userRoles, (role) => IMMUNE_ROLES.indexOf(role) >= 0)) {
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
