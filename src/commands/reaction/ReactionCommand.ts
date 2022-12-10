import { MessageReaction, Message, User } from "discord.js";

import { Command, CommandConfiguration } from "../Command";
import Reaction from "./index";

export interface ReactionCommandConfiguration extends CommandConfiguration {
    removeReaction?: boolean;
    emojiName?: string;
    execute: (reaction: MessageReaction, user: User) => Promise<void>;
}

export default class ReactionCommand extends Command {
    private _configuration: ReactionCommandConfiguration;

    constructor(configuration: ReactionCommandConfiguration) {
        super(configuration);
        this._configuration = configuration;
    }

    public get emojiName() {
        return this._configuration.emojiName;
    }

    public get removeReaction() {
        return this._configuration.removeReaction;
    }

    public canExecute() {
        return true;
    }

    public async execute(reaction: MessageReaction, user: User) {
        await this._configuration.execute(reaction, user);
    }
}
