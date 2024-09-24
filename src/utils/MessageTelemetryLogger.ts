import { EventDataBatch, EventHubProducerClient } from "@azure/event-hubs";
import { Message, TextChannel } from "discord.js";

export class MessageTelemetryLogger {
  private client: EventHubProducerClient;
  private messageQueueSize: number = 10;
  private batch: EventDataBatch | undefined;
  
  constructor(cs: string, ehName: string) {
    this.client = new EventHubProducerClient(cs, ehName);
    this.batch = undefined;
    this.logMessageTelemetry = this.logMessageTelemetry.bind(this);
  }

  public async logMessageTelemetry(message: Message) {
    const { channel } = message;
    if (!(channel instanceof TextChannel)) {
      return;
    }
    if (!this?.batch) {
      this.batch = await this.client.createBatch();
    }
    const { name: channelName } = channel;

    const { createdTimestamp: timestamp, channelId } = message;

    const added = this.batch?.tryAdd({
      body:{
        "channelId": channelId,
        "channelName": channelName,
        "timestamp": timestamp,
      }
    });
    if (added && this?.batch?.count >= this.messageQueueSize) {
      await this.client.sendBatch(this.batch);
      this.batch = await this.client.createBatch();
    }
  }
}