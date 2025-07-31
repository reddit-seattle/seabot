import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  Emoji,
  GuildMember,
  MessageFlags,
  resolveColor,
  Role,
  RoleColors,
  RoleColorsResolvable,
} from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";

import SlashCommand from "../SlashCommand";

import { configuration } from "../../../server";
import { REGEX } from "../../../utils/constants";
import { any } from "underscore";

const iconBlockList = ["thinkban"];

export default new SlashCommand({
  description: "Set your custom role (Premium only)",
  help: "Set your custom role (Premium only)",
  name: "set-premium-role",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("set-premium-role")
    .setDescription("Set your custom role color and icon (Premium only)")
    .addStringOptions([
      (option) => 
        option
          .setName("primary_color")
          .setDescription("Primary hex color (e.g., #FF0000 or FF0000)")
          .setRequired(false),
      (option) => 
        option
          .setName("secondary_color")
          .setDescription("Secondary hex color for gradient (optional)")
          .setRequired(false),
      (option) => 
        option
          .setName("tertiary_color")
          .setDescription("Tertiary hex color for gradient (optional)")
          .setRequired(false),
      (option) => 
        option
          .setName("emoji")
          .setDescription("Role icon emoji")
          .setRequired(false)
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const { options, member, user, guild } = interaction;
    const logs: string[] = [];
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    const primaryColor = options.getString("primary_color");
    const secondaryColor = options.getString("secondary_color");
    const tertiaryColor = options.getString("tertiary_color");
    const emoji = options.getString("emoji");

    // No change
    if (!primaryColor && !secondaryColor && !tertiaryColor && !emoji) {
      await interaction.followUp({
        flags: MessageFlags.Ephemeral,
        content: "Nothing to change",
      });
      return;
    }

    // try to find role for user
    const roleName = `${user.username}_${user.discriminator}`;
    let role = guild?.roles.cache.find((role: Role) => role.name == roleName);

    // create role if it doesn't exist
    if (!role) {
      logs.push(`Could not find custom role "${roleName}", creating new role.`);
      // order role
      const roleSeparatorPosition =
        guild?.roles.cache.get(configuration.roleIds.premium)?.position ?? 15;
      console.log(
        `Creating premium role ${roleName} at position ${
          roleSeparatorPosition + 1
        }`
      );
      role = await guild?.roles?.create({
        name: roleName,
        position: roleSeparatorPosition + 1,
      });
      if (!role) {
        logs.push(
          "Error creating role. Ask a mod to check permissions or existing roles."
        );
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }
      logs.push("Role created.");
    }

    // Helper function to validate and clean hex color
    const validateHexColor = (color: string | null): string | null => {
      if (!color) return null;
      const cleanHex = color.replace(/^#/, "");
      return REGEX.HEX.test(cleanHex) ? cleanHex : null;
    };

    // set colors
    if (primaryColor || secondaryColor || tertiaryColor) {
      const primary = validateHexColor(primaryColor);
      const secondary = validateHexColor(secondaryColor);
      const tertiary = validateHexColor(tertiaryColor);

      // ಠ_ಠ - block specific color
      const blockedColor = "25c059";
      if (primary === blockedColor || secondary === blockedColor || tertiary === blockedColor) {
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `ಠ_ಠ Pick a different color.`,
        });
        return;
      }

      // Validate at least primary color is valid
      if (!primary && primaryColor) {
        logs.push(`Invalid primary hex color: ${primaryColor}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }

      // Validate secondary color if provided
      if (secondaryColor && !secondary) {
        logs.push(`Invalid secondary hex color: ${secondaryColor}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }

      // Validate tertiary color if provided
      if (tertiaryColor && !tertiary) {
        logs.push(`Invalid tertiary hex color: ${tertiaryColor}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }

      // Build the colors object for role.setColors()
      if (primary == null) {
        return
      }
      const colorsObj: RoleColorsResolvable = { primaryColor: resolveColor(`#${primary}`) as any };
      if (primary) colorsObj.primaryColor = resolveColor(`#${primary}`);
      if (secondary) colorsObj.secondaryColor = resolveColor(`#${secondary}`);
      if (tertiary) colorsObj.tertiaryColor = resolveColor(`#${tertiary}`);

      logs.push(`Setting role colors: ${Object.entries(colorsObj).map(([k, v]) => `${k}: ${v}`).join(", ")}`);
      
      try {
        await role.setColors(colorsObj);
      } catch (error) {
        logs.push(`Error setting colors: ${error}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }
    }

    // set role icon
    if (emoji) {
      // ಠ_ಠ
      for (const blockedIcon of iconBlockList) {
        if (emoji.toLowerCase() === blockedIcon.toLowerCase()) {
          await interaction.followUp({
            flags: MessageFlags.Ephemeral,
            content: `ಠ_ಠ Pick a different emoji.`,
          });
          return;
        }
      }

      logs.push(`Setting role icon: ${emoji}`);
      try {
        const emoji_id = REGEX.EMOJI.exec(emoji)?.[1];
        const icon = emoji_id && await guild?.emojis.fetch(emoji_id);
        if (!icon) {
          logs.push(
            `Error finding emoji ${emoji} on this server, please add it or ask a mod`
          );
          await interaction.followUp({
            flags: MessageFlags.Ephemeral,
            content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
          });
          return;
        }
        await role?.setIcon(icon);
      } catch (ex: any) {
        if (ex instanceof DiscordAPIError) {
          logs.push(ex.message);
          await interaction.followUp({
            flags: MessageFlags.Ephemeral,
            content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
          });
          return;
        }
      }
    }

    // add the role to the user
    logs.push("Adding role to user");
    await (member as GuildMember)?.roles?.add(role);
    try {
      await interaction.followUp({
        flags: MessageFlags.Ephemeral,
        content: `Action completed - logs:\n${logs.join("\n")}`,
      });
    } catch (ex: any) {
      if (ex instanceof DiscordAPIError) {
        logs.push(ex.message);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
      }
    }
  },
});
