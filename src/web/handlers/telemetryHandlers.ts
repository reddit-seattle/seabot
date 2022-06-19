import { Client } from 'discord.js';
import {Request, Response} from 'express';
import _ from 'underscore';
import DBConnector from '../../db/DBConnector';
import { Telemetry } from '../../models/DBModels';
import { Database } from '../../utils/constants';
import { TelemetryMultiLineChart } from '../graphs/TelemetryMultiLineChart';
export const RootTelemetryHandler = async (client: Client, connector: DBConnector<Telemetry>, req: Request, res: Response) => {
    const telemetry = await connector.find(Database.Queries.TELEMETRY);
    const grouped = _.groupBy(telemetry, tel=> tel.channelId);
    const channelIds = Object.keys(grouped);
    const channelMappings: {[index: string]: string} = {};
    
    for(let i = 0; i < channelIds.length; i++) {
        const channel = channelIds[i];
        const name = await client.guilds.cache.get('370945003566006272')?.channels.cache.get(channel)?.name;
        channelMappings[channel] = name ?? 'unknown';
    }
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    const chart = TelemetryMultiLineChart(grouped, channelMappings)
    res.write(chart);
    res.end();
}

export const ChannelTelemetryHandler = async(client: Client, connector: DBConnector<Telemetry>, channelId: string, req: Request, res: Response) => {
    const telemetry = await connector.find(Database.Queries.TELEMETRY_BY_CHANNEL(channelId));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(JSON.stringify(telemetry));
    res.end();

}