import { Message } from "discord.js";

import ContentCommand from "./ContentCommand";

export default new ContentCommand({
    name: "seahawks",
    description: "Sea...HAWKS!",
    trigger: "SEA",
    handler: (message: Message) => {
        message.reply("HAWKS!");
    },
});
