import {
    scaleLinear,
    select,
    axisBottom,
    axisLeft,
    line,
    scaleTime,
    scaleSequential,
    interpolateRainbow,
} from "d3";
import { Telemetry } from "../../models/DBModels";
import { JSDOM } from "jsdom";
import _ from "underscore";
const Dimensions = {
    Width: 1000,
    Height: 500,
    Margin: 50,
};
const colors: { [index: string]: string } = {};

export const TelemetryMultiLineChart = (
    data: _.Dictionary<Telemetry[]>,
    channelMappings: { [index: string]: string }
) => {
    const channels = Object.keys(data);
    const now = new Date();
    const daysAgo = (numDays: number) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() - numDays);
        return newDate;
    };
    const { document } = new JSDOM("").window;
    global.document = document;
    const body = select(document).select("body");
    const svg = body
        .append("svg")
        .attr("width", Dimensions.Width)
        .attr("height", Dimensions.Height);

    // x axis
    const xScale = scaleTime()
        .range([Dimensions.Margin, Dimensions.Width - Dimensions.Margin])
        .domain([daysAgo(2), now]);
    const xAxis = axisBottom(xScale);

    // y axis
    const yScale = scaleLinear()
        .range([Dimensions.Height - Dimensions.Margin, Dimensions.Margin])
        .domain([0, 100]);
    const yAxis = axisLeft(yScale);

    // color scale for channels
    const colorScale = scaleSequential(interpolateRainbow).domain([
        0,
        channels.length,
    ]);

    const lineGen = line<Telemetry>()
        //x
        .x((data: Telemetry) => {
            return xScale(new Date(data.Window_End_Time));
        })
        //y
        .y((data: Telemetry) => {
            return yScale(data.COUNT_channelId);
        });
    svg.append("g")
        .attr("class", "x axis")
        .attr(
            "transform",
            `translate(0,${Dimensions.Height - Dimensions.Margin}')`
        )
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", `translate(${Dimensions.Margin}, 0')`)
        .call(yAxis);

    channels.forEach(async (channel, index) => {
        const color = colorScale(index);
        colors[channel] = color;
        svg.append("path")
            // @ts-ignore
            .attr("d", lineGen(data[channel]))
            .attr("title", channelMappings[channel])
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("fill", "none");
    });

    return `
    <!DOCTYPE HTML>
    <html>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${
            Dimensions.Width
        }" height="${Dimensions.Height}">
            ${svg.html()}
        </svg>
        <br/>
        Color legend:<br/>
        <table>
        ${Object.keys(colors).map(channel => {
            return `
            <tr width="500px">
                <td style="background-color: ${colors[channel]}; width: 100px;">____________</td>
                <td>${channelMappings[channel]}</td>
            </tr>`;
        }).join('')}
        </table>

    </html>`;
};
