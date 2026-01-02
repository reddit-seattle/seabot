import { ChatInputCommandBuilder } from "@discordjs/builders";
import {
  ChatInputCommandInteraction,
  ColorResolvable,
  DiscordAPIError,
  GuildMember,
  MessageFlags,
  resolveColor,
  Role,
  RoleColorsResolvable,
} from "discord.js";

import SlashCommand from "../SlashCommand";

import { configuration } from "../../../server";
import { REGEX } from "../../../utils/constants";
import { validateColor } from "../../../utils/helpers";

const iconBlockList = ["thinkban"];

export default new SlashCommand({
  description: "Set your custom role color and icon (Premium only)",
  help: "Set your custom role color and icon (Premium only)",
  name: "set-premium-role",
  adminOnly: true,
  builder: new ChatInputCommandBuilder()
    .setName("set-premium-role")
    .setDescription("Set your custom role color and icon (Premium only)")
    .addStringOptions([
      (option) =>
        option
          .setName("primary_color")
          .setDescription("Primary role color (e.g., #FF0000, FF0000, red)")
          .setRequired(false),
      (option) =>
        option
          .setName("secondary_color")
          .setDescription("Secondary role color for gradient effect")
          .setRequired(false),
      (option) =>
        option
          .setName("emoji")
          .setDescription("Role icon emoji")
          .setRequired(false),
    ]),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const { options, member, user, guild } = interaction;
    const logs: string[] = [];
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const primaryColor = options.getString("primary_color");
    const secondaryColor = options.getString("secondary_color");
    const emoji = options.getString("emoji");

    // No change
    if (!primaryColor && !secondaryColor && !emoji) {
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
        }`,
      );
      role = await guild?.roles?.create({
        name: roleName,
        position: roleSeparatorPosition + 1,
      });
      if (!role) {
        logs.push(
          "Error creating role. Ask a mod to check permissions or existing roles.",
        );
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }
      logs.push("Role created.");
    }

    // set colors
    if (primaryColor || secondaryColor) {
      // Validate colors (returns ColorResolvable or null)
      const primary = validateColor(primaryColor);
      const secondary = validateColor(secondaryColor);

      // ಠ_ಠ - block specific color (convert hex string to number for comparison)
      const blockedColorNumber = resolveColor("#25c059" as ColorResolvable);
      const primaryNumber = primary ? resolveColor(primary) : null;
      const secondaryNumber = secondary ? resolveColor(secondary) : null;

      if (
        primaryNumber === blockedColorNumber ||
        secondaryNumber === blockedColorNumber
      ) {
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `ಠ_ಠ Pick a different color.`,
        });
        return;
      }

      // Validate at least primary color is valid
      if (!primaryColor || primary === null) {
        logs.push(`Invalid primary color: ${primaryColor}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }

      // Validate secondary color if provided
      if (secondaryColor && secondary === null) {
        logs.push(`Invalid secondary color: ${secondaryColor}`);
        await interaction.followUp({
          flags: MessageFlags.Ephemeral,
          content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
        });
        return;
      }

      // Set the role colors
      const colorsObj: RoleColorsResolvable = { primaryColor: primary };

      if (secondary !== null) {
        colorsObj.secondaryColor = secondary as ColorResolvable;
      }

      logs.push(
        `Setting role colors: ${Object.entries(colorsObj)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`,
      );

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
        const icon = emoji_id && (await guild?.emojis.fetch(emoji_id));
        if (!icon) {
          logs.push(
            `Error finding emoji ${emoji} on this server, please add it or ask a mod`,
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
