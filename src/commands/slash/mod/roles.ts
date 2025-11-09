import { ChatInputCommandBuilder, ChatInputCommandRoleOption, ChatInputCommandUserOption } from "@discordjs/builders";
import { ChatInputCommandInteraction } from "discord.js";
import SlashCommand from "../SlashCommand";

// TODO - config / consts
const ASSIGNABLE_ROLES = [
  '884099771286036502', // minor
  '853016973804699689', // IRL
  '1333912863605002271', // politics timeout
  '1388337523012534342', // resident
  '1339007768203366492', // thunderdome
  '1437188425567703092', // holiday giveaway
];

// users who can't be assigned roles
const IMMUNE_ROLES = [
  '1077756366711697428'
]

enum SUBCOMMANDS {
  ASSIGN = "assign",
  REMOVE = "remove",
}

const userOption = new ChatInputCommandUserOption()
  .setName("user")
  .setDescription("User to assign/remove")
  .setRequired(true);
const roleOption = new ChatInputCommandRoleOption()
  .setName("role")
  .setDescription("Role to assign/remove")
  .setRequired(true);

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
          .setName(SUBCOMMANDS.ASSIGN)
          .setDescription("assign a role to a user")
          .addUserOptions([userOption])
          .addRoleOptions([roleOption]),
      (group) =>
        group
          .setName(SUBCOMMANDS.REMOVE)
          .setDescription("remove a role from a user")
          .addUserOptions([userOption])
          .addRoleOptions([roleOption]),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();
    const { options } = interaction;
    const subcommand = options.getSubcommand(true);

    const roleToAssign = options.getRole('role', true)
    const { id } = roleToAssign;
    if (ASSIGNABLE_ROLES.indexOf(id) >= 0) {
      const user = options.getUser('user', true);

      const guildUser = interaction.guild?.members.cache.get(user.id);
      const userRoles = guildUser?.roles.cache.map(x => x.id) ?? [];
      if (!userRoles.some((role) => IMMUNE_ROLES.indexOf(role) >= 0)) {
        if (subcommand === SUBCOMMANDS.ASSIGN) {
          // assign role
          await guildUser?.roles.add(id);
          await interaction.editReply(`${user.displayName} has been given the \`${roleToAssign.name}\` role`)
          return;
        }
        else if (subcommand === SUBCOMMANDS.REMOVE) {
          // remove role
          await guildUser?.roles.remove(id);
          await interaction.editReply(`${user.displayName} has been removed from the \`${roleToAssign.name}\` role`)
          return;
        }
      }
      // user has a blocking role
      await interaction.editReply(`${user.displayName} cannot have roles managed with this command.`);
      return;
    }
    // this role can't be assigned
    await interaction.editReply(`Role \`${roleToAssign.name}\` cannot be managed with this command.`);
    return;
  },
});
