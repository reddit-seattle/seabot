import { Events, GuildBan } from "discord.js";
import Aim from "./aim";
import AimAdmin from "./aimAdmin";
import DiscordEventRouter from "../../../discord/DiscordEventRouter";
import { banAimUser } from "./shared";
import { Logger } from "../../../utils/logger";

// Discord ban -> AIM ban. Unbans and guild leaves are deliberately not mirrored.
export function initAimBanMirror(eventRouter: DiscordEventRouter) {
  eventRouter.addEventListener(Events.GuildBanAdd, async (ban: GuildBan) => {
    try {
      await banAimUser(
        ban.client,
        ban.user.id,
        "discord-ban-mirror",
        ban.reason ?? "banned from discord server",
      );
    } catch (e) {
      Logger.error("AIM ban mirror failed:", e);
    }
  });
}

export default [Aim, AimAdmin];
