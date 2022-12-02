import { Message } from "discord.js";

import ContentCommand from "./ContentCommand";

export default new ContentCommand({
    name: "To be fair",
    description: "To be fair...letterkenny is pretty funny",
    trigger: /(tbf|to be fair)/i,
    handler: (message: Message) => {
        if (Math.random() >= 0.75) {
            message.reply("https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631");
        }
    },
});
