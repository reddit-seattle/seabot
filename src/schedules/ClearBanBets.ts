import { Logger } from "../utils/logger";
import IScheduledTask from "./IScheduledTask";
import { Duration } from "../utils/Time/Duration";
import BettingStore from "../db/BettingStore";

const ClearBanBets: IScheduledTask = {
  name: "ClearBanBets",
  description: "Deactivate all bets for users who have been in the server more than 30 days and not banned.",
  frequency: new Duration({ hours: 24 }), // runs every 24 hours
  handler: clearExpiredBanBets,
};

export default ClearBanBets;

function clearExpiredBanBets() {
  try {
    const cleared = BettingStore.deactivateExpiredBets();
    if (cleared > 0) {
      Logger.info(`[ClearBanBets] Deactivated ${cleared} expired ban bets.`);
    }
  } catch (e) {
    Logger.error("[ClearBanBets] Error deactivating expired ban bets:", e);
  }
}
