import { TelemetryStore } from "./TelemetryStore";
import { WordTrackerStore } from "./WordTrackerStore";
import { QuoteChannelStore, QuoteChannel } from "./QuoteChannelStore";

export { QuoteChannel };
export const telemetry = new TelemetryStore();
export const wordTrackerStore = new WordTrackerStore();
export const quoteChannelStore = new QuoteChannelStore();
