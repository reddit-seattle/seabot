import {
    DiscordAPIError,
    GuildMember,
    resolveColor,
    SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../Command";
import { configuration } from "../../../server";

export default new Command({
    description: "Set your custom role (Premium only)",
    help: "Set your custom role (Premium only)",
    name: "set-premium-role",
    adminOnly: true,
    slashCommandDescription: () => {
        return new SlashCommandBuilder()
            .setName("set-premium-role")
            .setDescription("Set your custom role color and icon (Premium only)")
            .addStringOption((option) => {
                return option
                    .setName("color")
                    .setDescription("hex color")
                    .setRequired(false);
            })
            .addStringOption((option) => {
                return option
                    .setName("emoji")
                    .setDescription("role icon")
                    .setRequired(false);
            });
    },
    executeSlashCommand: async (interaction) => {
        const { options, member, user, guild } = interaction;
        const logs: string[] = [];
        await interaction.deferReply({ ephemeral: true });
        const color = options.getString("color");
        const emoji = options.getString("emoji");

        // No change
        if(!color && !emoji) {
            await interaction.followUp({ephemeral: true, content: "Nothing to change"});
            return;
        }

        // try to find role for user
        const roleName = `${user.username}_${user.discriminator}`;
        let role = guild?.roles.cache.find((role) => role.name == roleName);

        // create role if it doesn't exist        
        if (!role) {
            logs.push(
                `Could not find custom role "${roleName}", creating new role.`
            );
            // order role
            const roleSeparatorPosition = guild?.roles.cache.get(configuration.roleIds.premium)?.position ?? 15;
            console.log(`Creating premium role ${roleName} at position ${roleSeparatorPosition+1}`);
            role = await guild?.roles?.create({
                name: roleName,
                position: roleSeparatorPosition+1
            });
            if (!role) {
                logs.push("Error creating role. Ask a mod to check permissions or existing roles.");
                await interaction.followUp({
                    ephemeral: true,
                    content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
                });
                return;
            }
            logs.push("Role created.");
        }

        // set color
        if(color) {
            // validate hex
            const hex = color?.replace(/^#/, "");

            // ಠ_ಠ
            if(color == '25c059') {
                await interaction.followUp({ephemeral: true, content: `ಠ_ಠ Pick a different color.`});
                return;
            }

            if (!hex || !RegExp("^[0-9A-F]{6}$", "i").test(hex)) {
                logs.push(`Invalid hex color: ${color}`);
                await interaction.followUp({ephemeral: true, content: `An error has occurred.\nLogs:\n${logs.join("\n")}`});
                return;
            }
            
            // resolve color
            logs.push(`Setting role color: ${color}`);
            const aRgbHex = hex.match(/.{1,2}/g);
            const aRgb = [
                parseInt(aRgbHex?.[0]!, 16),
                parseInt(aRgbHex?.[1]!, 16),
                parseInt(aRgbHex?.[2]!, 16),
            ];
            const finalColor = resolveColor([aRgb[0], aRgb[1], aRgb[2]]);
            await role.setColor(finalColor);
        }

        // set role icon
        if (emoji) {

            // ಠ_ಠ
            if(emoji == '<:thinkban:819834781561782302>') {
                await interaction.followUp({ephemeral: true, content: `ಠ_ಠ Pick a different emoji.`});
                return;
            }

            logs.push(`Setting role icon: ${emoji}`);
            try {
                const icon = await guild?.emojis.cache.find(
                    (guild_emoji) => guild_emoji.toString() == emoji
                );
                if(!icon){
                    logs.push(`Error finding icon ${emoji} on this server, please ask a mod to add it`);
                    await interaction.followUp({
                        ephemeral: true,
                        content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
                    });
                    return;
                }
                await role?.setIcon(icon);
            } catch (ex: any) {
                if (ex instanceof DiscordAPIError) {
                    logs.push(ex.message)
                    await interaction.followUp({
                        ephemeral: true,
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
                ephemeral: true,
                content: `Action completed - logs:\n${logs.join("\n")}`,
            });
        } catch (ex: any) {
            if (ex instanceof DiscordAPIError) {
                logs.push(ex.message);
                await interaction.followUp({
                    ephemeral: true,
                    content: `An error has occurred.\nLogs:\n${logs.join("\n")}`,
                });
            }
        }
    },
});
