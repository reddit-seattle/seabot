import { Message } from "discord.js";

import { Command, CommandConfiguration } from "../Command";

export interface ContentCommandConfiguration extends CommandConfiguration {
    trigger: string | RegExp;
    handler: (message: Message) => void;
}

export default class ContentCommand extends Command {
    private _configuration: ContentCommandConfiguration;

    constructor(configuration: ContentCommandConfiguration) {
        super(configuration);
        this._configuration = configuration;
    }

    private messageContainsTrigger(message: Message) {
        const trigger = this._configuration.trigger;
        if (trigger instanceof RegExp) {
            if (trigger.test(message.content)) {
                return true;
            }
        } else if (message.content.includes(trigger)) {
            return true;
        }

        return false;
    }

    public canExecute(message: Message) {
        return this.messageContainsTrigger(message);
    }

    public execute(message: Message) {
        this._configuration.handler(message);
    }
}
