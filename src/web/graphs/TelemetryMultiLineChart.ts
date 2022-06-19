import {scaleLinear,select,axisBottom,axisLeft,line, scaleTime } from "d3";
import { Telemetry } from "../../models/DBModels";
import { JSDOM } from 'jsdom';
import _ from "underscore";
const Dimensions = {
    Width: 1000,
    Height: 500,
    Margin: 50
}
const colors: {[index: string]: string} = {};
const names: {[index: string]: string} = {};

export const TelemetryMultiLineChart = (data: _.Dictionary<Telemetry[]>, channelMappings: {[index: string]: string}) => {
    const channels = Object.keys(data);
    const now = new Date();
    const daysAgo = (numDays: number) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() - numDays);
        return newDate;
    }
    const { document } = (new JSDOM('')).window;
    global.document = document;
    const body = select(document).select("body");
    const svg = body.append("svg")
    .attr("width", Dimensions.Width)
    .attr("height", Dimensions.Height);

    console.log(`xScale: [${daysAgo(2)}, ${now}]`);
    const xScale = scaleTime().range([Dimensions.Margin, Dimensions.Width - Dimensions.Margin]).domain([daysAgo(2), now]);
    console.log(`yScale: [0, 100]`);
    const yScale = scaleLinear().range([Dimensions.Height - Dimensions.Margin, Dimensions.Margin]).domain([0, 100]);

    const xAxis = axisBottom(xScale);
    const yAxis = axisLeft(yScale);

    const lineGen = line<Telemetry>()
        //x
        .x((data: Telemetry) => {
            console.log('xplot');
            console.dir(new Date(data.Window_End_Time));
            return xScale(new Date(data.Window_End_Time));
        })
        //y
        .y((data: Telemetry) => {
            console.log('yplot');
            console.dir(data.COUNT_channelId);
            return yScale(data.COUNT_channelId);
        });
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform',`translate(0,${Dimensions.Height - Dimensions.Margin}')`)
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .attr('transform',`translate(${Dimensions.Margin}, 0')`)
        .call(yAxis);

    channels.forEach(async channel => {
        const color = get_random_color();
        colors[channel] = color;
        svg.append('path')
        // @ts-ignore
            .attr('d', lineGen(data[channel]))
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('fill', 'none');
    })

    return `
    <!DOCTYPE HTML>
    <html>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${Dimensions.Width}" height="${Dimensions.Height}">
            ${svg.html()}
        </svg>
        <br/>
        Color info:<br/>
        <table>
        ${Object.keys(colors).map(channel => {
            return `
            <tr width="500px">
                <td style="background-color: ${colors[channel]}; width: 100px;">____________</td>
                <td>${channelMappings[channel]}</td>
            </tr>`
        })}
        </table>

    </html>`;

}

function get_random_color() 
{
    var color = "";
    for(var i = 0; i < 3; i++) {
        var sub = Math.floor(Math.random() * 256).toString(16);
        color += (sub.length == 1 ? "0" + sub : sub);
    }
    return "#" + color;
}