import { EventDataBatch, EventHubProducerClient } from "@azure/event-hubs";
import { Message, TextChannel } from "discord.js";
import { contains } from "underscore";
import { ChannelIds } from "./constants";

export class MessageTelemetryLogger {
    private client: EventHubProducerClient;
    private messageQueueSize: number = 10;
    private batch: EventDataBatch | undefined;
    public Ready: Promise<any>;
    constructor(eh: EventHubProducerClient) {
        this.client = eh;
        this.Ready = new Promise(async (res, rej) => {
            await this.CreateBatch();
            res(true);
        });
    }
    async logMessageTelemetry(message: Message) {
        // check loggable
        const { channel } = message;

        // dont log non-text channels
        if (!(channel instanceof TextChannel)) {
            return;
        }

        const parent = channel.parentId;
        // dont log anything not in specific loggable categories
        if (!contains(ChannelIds.TELEMETRY_CATEGORIES, parent)) {
            return;
        }

        const {
            createdTimestamp: timestamp,
            channelId,
        } = message;
        // try add
        const added = this.batch?.tryAdd({
            body: {
                channelId,
                timestamp,
            },
        });
        if (added && this?.batch?.count == this.messageQueueSize) {
            await this.client.sendBatch(this.batch);
            await this.CreateBatch();
        }
    }

    private CreateBatch = async () => {
        this.batch = await this.client.createBatch();
    };
}
