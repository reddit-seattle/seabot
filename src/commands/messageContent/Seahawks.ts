import { Message } from "discord.js";

export default {
    trigger: "SEA",
    handler: (message: Message) => {
        message.reply("HAWKS!");
    }
}