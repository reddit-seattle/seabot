import { Command, CommandConfiguration } from "../../../models/Command";
import DBConnector from "../../../db/DBConnector";
import { Database } from "../../../utils/constants";
import { cosmosClient } from "../../../server";

export class DatabaseCommand<ModelType> extends Command {
    private static connectorCache = new Map<string, any>();
    public static getConnector<ModelType>(connectorType: "Awards" | "Incidents" | "MessageTelemetry") {
        if (DatabaseCommand.connectorCache.has(connectorType)) {
            return DatabaseCommand.connectorCache.get(connectorType);
        }

        const connector = new DBConnector<ModelType>(cosmosClient, Database.DATABASE_ID, connectorType);

        connector.init().catch((reason) => {
            console.error(`Failed to connect to database container of type ${connectorType}`);
            console.error(reason);
        });

        return connector;
    }

    private _connector;
    public get connector() {
        return this._connector;
    }

    constructor(connectorType: "Awards" | "Incidents" | "MessageTelemetry", configuration: CommandConfiguration) {
        super(configuration);
        this._connector = DatabaseCommand.getConnector<ModelType>(connectorType);
    }
}
