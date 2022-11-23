import { Message } from "discord.js";

export default {
    trigger: /(tbf|to be fair)/i,
    handler: (message: Message) => {
        if (Math.random() >= 0.75) {
            message.reply("https://tenor.com/view/letterkenny-to-be-tobefair-gif-14136631");
        }
    }
}