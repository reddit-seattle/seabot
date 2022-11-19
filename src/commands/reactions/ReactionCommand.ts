import { Command, CommandConfiguration } from "../../models/Command";

export default class ReactionCommand extends Command {
    private _emojiId: string;
    public get emojiId() {
        return this._emojiId;
    }
    private _removeReaction: boolean;
    public get removeReaction() {
        return this._removeReaction;
    }

    constructor(emojiId: string, removeReaction = false, config: CommandConfiguration) {
        super(config);
        this._emojiId = emojiId;
        this._removeReaction = removeReaction;
    }
}

export interface ReactionCommandDictionary {
    [id: string]: ReactionCommand;
}
