import { Message, MessageAttachment } from "discord.js";
import { Command } from "../models/Command";
import { createCanvas, loadImage, NodeCanvasRenderingContext2D } from 'canvas';
import getColors from 'get-image-colors';
import fetch from "node-fetch";
import { Endpoints, Constants } from "../utils/constants";

const IMAGE_SIZE = Constants.Quotes.ImageSize;
const INNER_WIDTH = IMAGE_SIZE - (2 * Constants.Quotes.TextMargin);

export const FrameQuote: Command = {
    name: 'framequote',
    help: 'framequote this is a really terrible quote over a random image',
    description: '(Work In Progress) Frame a quote on a motivational image.',
    async execute(message: Message, args?: string[]) {

        const imageResponse = await fetch(Endpoints.Quotes.Image(IMAGE_SIZE));
        const imageUrl = imageResponse.url;
        args?.shift();
        let quote = args?.join(" ");
        if (!quote) {
            const quoteResponse = await fetch(Endpoints.Quotes.Swanson);
            quote = (await quoteResponse?.json() as string[])?.[0] || 'Quotes are broken, apparently.';
        }

        const image = await loadImage(imageUrl);
        const canvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
        const ctx = canvas.getContext('2d');
        ctx.font = '80px bold Sans-serif';

        const colors = await getColors(imageUrl);
        const mainColor = colors[0].rgb();

        // found this jawn on stackoverflow don't judge me
        // https://stackoverflow.com/questions/1855884/determine-font-color-based-on-background-color
        const luma = ((0.299 * mainColor[0]) + (0.587 * mainColor[1]) + (0.114 * mainColor[2])) / 255;
        ctx.fillStyle = luma > 0.5 ? 'black' : 'white';
        ctx.strokeStyle = luma > 0.5 ? 'white' : 'black';

        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        splitText(ctx, quote, canvas.width / 2, canvas.height / 2, INNER_WIDTH);
        const attachment = new MessageAttachment(canvas.toBuffer(), `${args?.join("-") || 'quote'}.png`);
        message.channel.send(attachment);
    },
}

const splitText: (context: NodeCanvasRenderingContext2D, quote: string, x: number, y: number, maxWidth: number) => void =
    (context, quote, x, y, maxWidth) => {
        const words = quote.split(' ');
        const lineHeight = 40;
        let line = '';
        const lines = [];

        for (var n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const lineWidth = context.measureText(testLine).width;
            if (lineWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            }
            else {
                line = testLine;
            }
        }
        line && lines.push(line);

        const totalHeight = lineHeight * ((2 * lines.length) - 1);
        let yOffset = y - (totalHeight / 2);
        lines.forEach(line => {
            context.fillText(line, x, yOffset, maxWidth);
            context.strokeText(line, x, yOffset, maxWidth);
            yOffset += (lineHeight * 2);
        });


    }