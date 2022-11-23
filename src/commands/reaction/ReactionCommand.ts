import { Command, CommandConfiguration } from "../Command";

export interface ReactionCommandConfiguration extends CommandConfiguration {
    removeReaction?: boolean;
    emojiName?: string;
}

export default class ReactionCommand extends Command {
    private _emojiName: string;
    public get emojiName() { return this._emojiName; }
    private _removeReaction: boolean;
    public get removeReaction() {
        return this._removeReaction;
    }

    constructor(config: ReactionCommandConfiguration) {
        super(config);
        this._removeReaction = config.removeReaction ?? false;
        this._emojiName = config.emojiName ?? config.name;
    }
}
