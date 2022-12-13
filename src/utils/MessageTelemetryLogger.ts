import { EventDataBatch, EventHubProducerClient } from "@azure/event-hubs";
import { Message, TextChannel } from "discord.js";

import { configuration } from "../server";

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
    const { channel } = message;

    if (!(channel instanceof TextChannel)) {
      return;
    }

    if (!configuration.telemetry?.channels?.includes(channel.id)) {
      const { parentId } = channel;
      if (
        !parentId ||
        !configuration.telemetry?.categories?.includes(parentId)
      ) {
        return;
      }
    }

    const { createdTimestamp: timestamp, channelId } = message;
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
